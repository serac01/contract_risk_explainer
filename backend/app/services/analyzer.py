def analyze_contract(text: str):

    clauses = split_clauses(text)

    analyzed = []

    for clause in clauses:

        risk = detect_risk(clause)

        analyzed.append({
            "clause": clause,
            "risk": risk["level"],
            "score": risk["score"],
            "explanation": risk["explanation"],
            "tokens": risk["tokens"]
        })

    return {
        "overall_risk": "medium",
        "clauses": analyzed
    }


def split_clauses(text):
    return [c.strip() for c in text.split(".") if c.strip()]


def detect_risk(clause):

    clause_lower = clause.lower()

    if "liable" in clause_lower:
        return {
            "level": "high",
            "score": 0.9,
            "explanation": "Liability clause detected",
            "tokens": [
                {"word": "liable", "weight": 0.9}
            ]
        }

    if "must" in clause_lower:
        return {
            "level": "medium",
            "score": 0.6,
            "explanation": "Obligation language detected",
            "tokens": [
                {"word": "must", "weight": 0.7}
            ]
        }

    return {
        "level": "low",
        "score": 0.2,
        "explanation": "No major risks detected",
        "tokens": []
    }