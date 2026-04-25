from __future__ import annotations

from enum import Enum


class RiskCategory(str, Enum):
    UNBOUNDED_LIABILITY = "unbounded_liability"
    BROAD_INDEMNIFICATION = "broad_indemnification"
    OVERBROAD_CONFIDENTIALITY_SCOPE = "overbroad_confidentiality_scope"
    PERPETUAL_OR_UNBOUNDED_TERM = "perpetual_or_unbounded_term"
    ONE_SIDED_TERMINATION = "one_sided_termination"
    JURISDICTION_SURPRISE = "jurisdiction_surprise"
    ASSIGNMENT_WITHOUT_CONSENT = "assignment_without_consent"
    INJUNCTIVE_RELIEF_WAIVER = "injunctive_relief_waiver"
    IP_OWNERSHIP_TRANSFER = "ip_ownership_transfer"
    NON_SOLICIT_SCOPE = "non_solicit_scope"
    RETURN_OR_DESTROY_OBLIGATIONS = "return_or_destroy_obligations"
    RESIDUALS_CLAUSE = "residuals_clause"
    OTHER = "other"
    BENIGN = "benign"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


HUMAN_LABEL: dict[str, str] = {
    RiskCategory.UNBOUNDED_LIABILITY.value: "Unbounded liability",
    RiskCategory.BROAD_INDEMNIFICATION.value: "Broad indemnification",
    RiskCategory.OVERBROAD_CONFIDENTIALITY_SCOPE.value: "Overbroad confidentiality scope",
    RiskCategory.PERPETUAL_OR_UNBOUNDED_TERM.value: "Perpetual or unbounded term",
    RiskCategory.ONE_SIDED_TERMINATION.value: "One-sided termination rights",
    RiskCategory.JURISDICTION_SURPRISE.value: "Unexpected jurisdiction / governing law",
    RiskCategory.ASSIGNMENT_WITHOUT_CONSENT.value: "Assignment without consent",
    RiskCategory.INJUNCTIVE_RELIEF_WAIVER.value: "Waiver of injunctive relief",
    RiskCategory.IP_OWNERSHIP_TRANSFER.value: "IP ownership transfer",
    RiskCategory.NON_SOLICIT_SCOPE.value: "Non-solicit / non-compete scope",
    RiskCategory.RETURN_OR_DESTROY_OBLIGATIONS.value: "Return-or-destroy obligations",
    RiskCategory.RESIDUALS_CLAUSE.value: "Residuals clause",
    RiskCategory.OTHER.value: "Other",
    RiskCategory.BENIGN.value: "Benign",
}


LEVEL_COLOR: dict[str, str] = {
    RiskLevel.LOW.value: "#2e7d32",
    RiskLevel.MEDIUM.value: "#ed6c02",
    RiskLevel.HIGH.value: "#c62828",
}


CATEGORY_HINTS: dict[str, str] = {
    RiskCategory.UNBOUNDED_LIABILITY.value: "No cap on damages; exposure could exceed contract value.",
    RiskCategory.BROAD_INDEMNIFICATION.value: "One party indemnifies the other across a very wide set of losses.",
    RiskCategory.OVERBROAD_CONFIDENTIALITY_SCOPE.value: "Confidential information is defined so broadly it may cover public info.",
    RiskCategory.PERPETUAL_OR_UNBOUNDED_TERM.value: "Obligations never expire, or duration is not specified.",
    RiskCategory.ONE_SIDED_TERMINATION.value: "Only one party can terminate, or only on narrow grounds.",
    RiskCategory.JURISDICTION_SURPRISE.value: "Disputes governed by an unusual or counterparty-favourable jurisdiction.",
    RiskCategory.ASSIGNMENT_WITHOUT_CONSENT.value: "Counterparty can transfer the contract without your approval.",
    RiskCategory.INJUNCTIVE_RELIEF_WAIVER.value: "You waive your right to seek injunctions against the counterparty.",
    RiskCategory.IP_OWNERSHIP_TRANSFER.value: "Intellectual property created during the engagement transfers unexpectedly.",
    RiskCategory.NON_SOLICIT_SCOPE.value: "Restrictions on hiring, soliciting, or competing are unusually broad.",
    RiskCategory.RETURN_OR_DESTROY_OBLIGATIONS.value: "Obligations to return or destroy data may be operationally infeasible.",
    RiskCategory.RESIDUALS_CLAUSE.value: "Counterparty retains the right to use information they 'remember'.",
    RiskCategory.OTHER.value: "Classifier did not match a known risk pattern.",
    RiskCategory.BENIGN.value: "No material risk detected.",
}


ALL_CATEGORIES: list[str] = [c.value for c in RiskCategory]
ALL_LEVELS: list[str] = [l.value for l in RiskLevel]
