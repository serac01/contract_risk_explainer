from __future__ import annotations

import hashlib
import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from .splitter import split_file
from .utils import CACHE, key_for

from openai import OpenAI

from .taxonomy import ALL_CATEGORIES, ALL_LEVELS, CATEGORY_HINTS, HUMAN_LABEL

_MODEL = os.environ.get("CONTRACT_ANALYSER_MODEL", "gpt-4o-mini")


_SYSTEM = (
    "You are an expert NDA reviewer. Given a single clause, classify it into exactly "
    "one risk category from the fixed enum, assign a risk level (low/medium/high), and "
    "write a short rationale (<= 25 words) for a business reader. If the clause is "
    "routine and poses no unusual risk, use category 'benign' and level 'low'. Never "
    "invent categories outside the enum."
)

_SCHEMA = {
    "name": "clause_risk",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["risk_category", "risk_level", "short_rationale", "llm_confidence"],
        "properties": {
            "risk_category": {"type": "string", "enum": ALL_CATEGORIES},
            "risk_level": {"type": "string", "enum": ALL_LEVELS},
            "short_rationale": {"type": "string"},
            "llm_confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
        },
    },
}


@dataclass
class ClauseClassification:
    risk_category: str
    risk_level: str
    short_rationale: str
    llm_confidence: float

    @property
    def category_label(self) -> str:
        return HUMAN_LABEL.get(self.risk_category, self.risk_category)

    @property
    def is_risky(self) -> bool:
        return self.risk_category != "benign"


def classify_clause(text: str, model: str = _MODEL) -> ClauseClassification:
    ckey = key_for(model, text.strip())
    cached = CACHE.get(ckey)
    if cached:
        return ClauseClassification(**cached)

    client = OpenAI()
    user_msg = _build_user_message(text)
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_schema", "json_schema": _SCHEMA},
        temperature=0,
    )
    payload = json.loads(resp.choices[0].message.content)
    result = ClauseClassification(**payload)
    CACHE.set(ckey, asdict(result))
    return result


def _build_user_message(text: str) -> str:
    category_lines = "\n".join(f"- {c}: {CATEGORY_HINTS[c]}" for c in ALL_CATEGORIES)
    return f'Categories (use one):\n{category_lines}\n\nClause:\n"""{text.strip()}"""'





if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    # file = Path(
    #     "/Users/benjaminarkoafrasah/Projects/wasp-lighthouse/contract_risk_explainer/contracts/contract_mock.pdf"
    # )
    # clauses = split_file(file)
    # print(clauses[0].text)
    # print(clauses[0].section_title)
    result = classify_clause(
        "The Company reserves the right, at its sole discretion and without prior notice, to modify, amend, or replace any terms of this Agreement at any time. Continued use of the services shall constitute acceptance of such changes, regardless of whether the Client has reviewed them."
    )
    print(result)