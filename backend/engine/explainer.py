from __future__ import annotations

import os
import re
from dataclasses import dataclass
from .utils import CACHE, key_for
from llmSHAP import BasicPromptCodec, DataHandler, ShapleyAttribution
from llmSHAP.attribution_methods.coalition_sampler import RandomSampler
from llmSHAP.llm import OpenAIInterface

_MODEL = os.environ.get("CONTRACT_ANALYSER_MODEL", "gpt-4o-mini")
_MAX_FEATURES = int(os.environ.get("CONTRACT_ANALYSER_MAX_FEATURES", "8"))
_FULL_ENUM_MAX = int(os.environ.get("CONTRACT_ANALYSER_FULL_ENUM_MAX", "4"))
_SAMPLING_RATIO = float(os.environ.get("CONTRACT_ANALYSER_SAMPLING_RATIO", "0.05"))


@dataclass
class TokenAttribution:
    token: str
    score: float
    start: int
    end: int


@dataclass
class AttributionResult:
    output: str
    tokens: list[TokenAttribution]

    @property
    def top(self) -> list[TokenAttribution]:
        return sorted(self.tokens, key=lambda t: abs(t.score), reverse=True)


_ATTRIBUTION_SYSTEM = (
    "You are an NDA risk classifier. Reply with EXACTLY one lowercase category from this "
    "fixed enum: unbounded_liability, broad_indemnification, overbroad_confidentiality_scope, "
    "perpetual_or_unbounded_term, one_sided_termination, jurisdiction_surprise, "
    "assignment_without_consent, injunctive_relief_waiver, ip_ownership_transfer, "
    "non_solicit_scope, return_or_destroy_obligations, residuals_clause, other, benign. "
    "Output the single category token only — no prose, no punctuation."
)


def attribute_clause(
    text: str,
    model: str = _MODEL,
    num_threads: int = 8,
) -> AttributionResult:
    """Run llmSHAP Shapley attribution over the words of a clause.

    Caches results on disk keyed by (model, text) so re-runs (and the demo) are fast.
    For clauses with more than _FULL_ENUM_MAX features, uses RandomSampler to keep
    the number of LLM calls tractable.
    """
    ckey = key_for(model, "attribution", text.strip())
    cached = CACHE.get(ckey)
    if cached:
        return _from_cache(cached)



    tokens, spans = _tokenize_with_spans(text)
    data: dict[int, str] = {i: tok for i, tok in enumerate(tokens)}
    handler = DataHandler(data)
    codec = BasicPromptCodec(system=_ATTRIBUTION_SYSTEM)
    llm = OpenAIInterface(model_name=model, temperature=0, max_tokens=24)

    sampler = None
    if len(tokens) > _FULL_ENUM_MAX:
        sampler = RandomSampler(sampling_ratio=_SAMPLING_RATIO, seed=0)

    shap = ShapleyAttribution(
        model=llm,
        data_handler=handler,
        prompt_codec=codec,
        sampler=sampler,
        use_cache=True,
        num_threads=num_threads,
        verbose=False,
    )
    result = shap.attribution()

    scores = _coerce_attribution_map(result.attribution, len(tokens))
    token_attrs = [
        TokenAttribution(token=tok, score=scores.get(i, 0.0), start=spans[i][0], end=spans[i][1])
        for i, tok in enumerate(tokens)
    ]
    out = AttributionResult(output=str(result.output), tokens=token_attrs)
    CACHE.set(ckey, _to_cache(out))
    return out


def _tokenize_with_spans(text: str) -> tuple[list[str], list[tuple[int, int]]]:
    tokens: list[str] = []
    spans: list[tuple[int, int]] = []
    for m in re.finditer(r"\S+", text):
        tokens.append(m.group(0))
        spans.append((m.start(), m.end()))
    if len(tokens) > _MAX_FEATURES:
        tokens, spans = _coarsen(tokens, spans, _MAX_FEATURES)
    return tokens, spans


def _coarsen(tokens: list[str], spans: list[tuple[int, int]], target: int) -> tuple[list[str], list[tuple[int, int]]]:
    group = max(1, len(tokens) // target + (1 if len(tokens) % target else 0))
    new_tokens: list[str] = []
    new_spans: list[tuple[int, int]] = []
    for i in range(0, len(tokens), group):
        chunk = tokens[i : i + group]
        start = spans[i][0]
        end = spans[min(i + group - 1, len(spans) - 1)][1]
        new_tokens.append(" ".join(chunk))
        new_spans.append((start, end))
    return new_tokens, new_spans


def _coerce_attribution_map(raw, n_tokens: int) -> dict[int, float]:
    """llmSHAP returns Dict[str, Dict[str, float]] like {"0": {"score": x, "value": "tok"}}."""
    out: dict[int, float] = {}
    if not isinstance(raw, dict):
        return out
    for key, payload in raw.items():
        try:
            idx = int(key)
        except (TypeError, ValueError):
            continue
        if not (0 <= idx < n_tokens):
            continue
        score = 0.0
        if isinstance(payload, dict):
            try:
                score = float(payload.get("score", 0.0))
            except (TypeError, ValueError):
                score = 0.0
        else:
            try:
                score = float(payload)
            except (TypeError, ValueError):
                score = 0.0
        out[idx] = score
    return out


def _to_cache(r: AttributionResult) -> dict:
    return {
        "output": r.output,
        "tokens": [
            {"token": t.token, "score": t.score, "start": t.start, "end": t.end}
            for t in r.tokens
        ],
    }


def _from_cache(d: dict) -> AttributionResult:
    return AttributionResult(
        output=d["output"],
        tokens=[TokenAttribution(**t) for t in d["tokens"]],
    )
