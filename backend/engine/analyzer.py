import sys
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed


from pathlib import Path
from .splitter import Clause, split_text, read_pdf
import argparse
from dotenv import load_dotenv
from typing import Optional
from .explanation import ClauseExplanation, explain_clause
from .taxonomy import HUMAN_LABEL
from .explainer import AttributionResult
import json
import traceback


_MAX_PARALLEL_CLAUSES = int(os.environ.get("CONTRACT_ANALYSER_MAX_PARALLEL_CLAUSES", "3"))


def _log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


def analyze_contract(text: Optional[str] = None):
    load_dotenv()
    clauses = split_text(text)
    _log(f"[analyzer] split into {len(clauses)} clauses")

    explanations: dict[str, ClauseExplanation] = {}
    errors: list[dict] = []

    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=max(1, _MAX_PARALLEL_CLAUSES)) as pool:
        futures = {pool.submit(_explain_with_log, c): c for c in clauses}
        for fut in as_completed(futures):
            clause = futures[fut]
            try:
                explanations[clause.id] = fut.result()
            except Exception as e:
                _log(f"[analyzer] {clause.id} ERROR {e}")
                _log(traceback.format_exc())
                errors.append({"clause_id": clause.id, "error": str(e)})

    _log(f"[analyzer] done in {time.perf_counter() - t0:.1f}s ({len(explanations)} ok, {len(errors)} err)")

    payload = _build_payload(clauses, explanations, errors)

    # # write to file
    # with open("payload.json", "w") as f:
    #     json.dump(payload, f, indent=5)

    return payload


def _explain_with_log(clause: Clause) -> ClauseExplanation:
    _log(f"[analyzer] {clause.id} start ({clause.word_count}w) {clause.section_title}")
    t0 = time.perf_counter()
    explanation = explain_clause(clause.id, clause.text)
    cls = explanation.classification
    tag = f"{cls.risk_category}/{cls.risk_level}"
    attr = "+attr" if explanation.attribution is not None else "no-attr"
    _log(f"[analyzer] {clause.id} done {tag} {attr} in {time.perf_counter() - t0:.1f}s")
    return explanation


def _build_payload(clauses: list[Clause], explanations: dict[str, ClauseExplanation], errors: list[dict]):
    risky = [e for e in explanations.values() if e.classification.is_risky]

    summary = {
        "clause_count": len(clauses),
        "analysed": len(explanations),
        "risky": len(risky),
        "high": sum(1 for e in risky if e.classification.risk_level == "high"),
        "medium": sum(1 for e in risky if e.classification.risk_level == "medium"),
        "low": sum(1 for e in risky if e.classification.risk_level == "low"),
    }

    return {
        "summary": summary,
        "clauses": [_serialize_clause(c, explanations.get(c.id)) for c in clauses],
        "errors": errors,
    }


def _serialize_clause(clause: Clause, explanation: ClauseExplanation | None):
    base = {
        "id": clause.id,
        "section_title": clause.section_title,
        "text": clause.text,
        "word_count": clause.word_count,
        "char_start": clause.char_start,
        "char_end": clause.char_end,
    }

    if explanation is None:
        base["analysis"] = None
        return base

    cls = explanation.classification
    base["analysis"] = {
        "risk_category": cls.risk_category,
        "risk_category_label": HUMAN_LABEL.get(cls.risk_category, cls.risk_category),
        "risk_level": cls.risk_level,
        "is_risky": cls.is_risky,
        "llm_confidence": cls.llm_confidence,
        "confidence": explanation.confidence,
        "short_rationale": cls.short_rationale,
        "rationale_text": explanation.rationale_text,
        "attribution": _serialize_attribution(explanation.attribution),
        "top_tokens": [
            {"token": t.token, "score": t.score, "start": t.start, "end": t.end} for t in explanation.top_tokens(5)
        ],
    }
    return base


def _serialize_attribution(attr: AttributionResult | None) -> dict | None:
    if attr is None:
        return None
    return {
        "output": attr.output,
        "tokens": [{"token": t.token, "score": t.score, "start": t.start, "end": t.end} for t in attr.tokens],
    }


if __name__ == "__main__":
    load_dotenv()
    p = argparse.ArgumentParser(
        prog="contract-analyser",
    )
    p.add_argument("--file", "-f", help="Path to a .txt/.md/.pdf contract.")
    p.add_argument("--text", "-t", help="Inline contract text.")
    args = p.parse_args()

    if args.file:
        file = Path(args.file)

        if file.suffix.lower() == ".pdf":
            text = read_pdf(file.read_bytes())
        else:
            text = file.read_text()
    elif args.text:
        text = args.text
    else:
        raise ValueError("No input source provided.")

    analyze_contract(text)
