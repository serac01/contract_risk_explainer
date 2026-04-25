// Playbook overlay — standard positions and suggested counter-language per
// risk_category. Keyed off Analysis.risk_category from the schema. Lives
// outside MOCK_PAYLOAD because it's local-product data, not backend output.

window.PLAYBOOK = {
  auto_renewal: {
    standard: "30–60 day non-renewal notice; auto-renew acceptable on 1-year terms.",
    redline: "…unless either party provides written notice of non-renewal at least ~~ninety (90)~~ **sixty (60)** days prior to the end of the then-current term.",
    severity: "On-market with friction",
  },
  uncapped_price_increase: {
    standard: "CPI-linked, capped at lower of CPI or 5% per year, with termination right if exceeded.",
    redline: "Vendor may increase fees once per year by no more than the lesser of (a) ~~fifteen percent (15%)~~ **five percent (5%)** or (b) the change in CPI-U over the prior 12 months. Customer may terminate without penalty within 30 days of notice of any increase exceeding this cap.",
    severity: "Off-market — must redline",
  },
  feedback_assignment: {
    standard: "Vendor licence to use feedback is fine; outright assignment is not. License back, no exclusivity.",
    redline: "Customer **grants Vendor a non-exclusive, royalty-free license** to use feedback. ~~shall be owned by Vendor~~",
    severity: "On-market with friction",
  },
  warranty_disclaimer_short: {
    standard: "Continuous performance warranty tied to SLA; not a 30-day window.",
    redline: "Vendor warrants that the Services will perform substantially in accordance with the Documentation **throughout the Term**. ~~for a period of thirty (30) days following initial delivery~~",
    severity: "Off-market — push back",
  },
  low_liability_cap: {
    standard: "12 months of fees, with carve-outs for IP indemnity, breach of confidentiality, gross negligence, and willful misconduct.",
    redline: "…shall not exceed the fees paid by Customer to Vendor in the ~~three (3)~~ **twelve (12)** months immediately preceding the event. **The foregoing cap shall not apply to (i) breach of confidentiality, (ii) Vendor's indemnification obligations, or (iii) gross negligence or willful misconduct.**",
    severity: "Off-market — must redline",
  },
  weak_sla_remedies: {
    standard: "≥99.9% availability; service credits + termination right after repeated misses; remedies non-exclusive.",
    redline: "…availability of ~~99.5%~~ **99.9%**… service credits **shall not be Customer's sole or exclusive remedy**, and Customer may terminate without penalty after three (3) consecutive months of failure to meet the target.",
    severity: "Off-market — push back",
  },
  asymmetric_assignment: {
    standard: "Mutual change-of-control assignment OK; Customer often accepts.",
    redline: "(Acceptable as drafted — flag only if Customer expects to assign in near term.)",
    severity: "On-market",
  },
};

// Pretty labels for risk_category keys (faceted filter)
window.CATEGORY_LABELS = {
  definitions_standard: "Definitions",
  auto_renewal: "Auto-renewal",
  uncapped_price_increase: "Price increase",
  feedback_assignment: "Feedback IP",
  warranty_disclaimer_short: "Warranty",
  low_liability_cap: "Liability cap",
  ip_indemnity_standard: "IP indemnity",
  weak_sla_remedies: "SLA",
  confidentiality_standard: "Confidentiality",
  governing_law_standard: "Governing law",
  asymmetric_assignment: "Assignment",
  notices_standard: "Notices",
  entire_agreement_standard: "Integration",
};
