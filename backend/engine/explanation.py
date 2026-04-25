from __future__ import annotations

from dataclasses import dataclass

from .classifier import ClauseClassification, classify_clause
from .explainer import AttributionResult, TokenAttribution, attribute_clause
from .taxonomy import CATEGORY_HINTS, HUMAN_LABEL


@dataclass
class ClauseExplanation:
    clause_id: str
    clause_text: str
    classification: ClauseClassification
    attribution: AttributionResult | None
    confidence: float
    rationale_text: str

    def top_tokens(self, k: int = 5) -> list[TokenAttribution]:
        if self.attribution is None:
            return []
        return self.attribution.top[:k]


def explain_clause(
    clause_id: str,
    clause_text: str,
    skip_attribution_for_benign: bool = True,
) -> ClauseExplanation:
    classification = classify_clause(clause_text)
    if skip_attribution_for_benign and not classification.is_risky:
        return ClauseExplanation(
            clause_id=clause_id,
            clause_text=clause_text,
            classification=classification,
            attribution=None,
            confidence=classification.llm_confidence,
            rationale_text=classification.short_rationale,
        )

    attribution = attribute_clause(clause_text)
    confidence = _confidence_from_attribution(attribution, classification.llm_confidence)
    rationale = _compose_rationale(classification, attribution)
    return ClauseExplanation(
        clause_id=clause_id,
        clause_text=clause_text,
        classification=classification,
        attribution=attribution,
        confidence=confidence,
        rationale_text=rationale,
    )


def _confidence_from_attribution(attribution: AttributionResult, llm_self: float) -> float:
    """Confidence as attribution concentration — top-3 mass over total abs mass.

    Blended with the LLM's self-reported confidence (70/30) so a clause that the
    classifier is unsure about still shows low confidence even if attribution is sharp.
    """
    scores = [abs(t.score) for t in attribution.tokens]
    total = sum(scores)
    if total <= 0:
        concentration = 0.0
    else:
        top3 = sum(sorted(scores, reverse=True)[:3])
        concentration = min(top3 / total, 1.0)
    return round(0.7 * concentration + 0.3 * float(llm_self or 0.0), 3)


def _compose_rationale(classification: ClauseClassification, attribution: AttributionResult) -> str:
    top = [t for t in attribution.top[:3] if t.score > 0]
    if not top:
        return classification.short_rationale
    quoted = ", ".join(f'"{t.token}"' for t in top)
    category = HUMAN_LABEL.get(classification.risk_category, classification.risk_category)
    hint = CATEGORY_HINTS.get(classification.risk_category, "")
    return f"Flagged as {category}. Driven by {quoted}. {hint}".strip()
