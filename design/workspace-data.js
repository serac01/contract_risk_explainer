// Workspace — a portfolio of contracts in different review states.
// The "active" contract reuses the existing MOCK_PAYLOAD (Acme MSA).
// Other contracts vary state: uploading, streaming, complete, all-clear, errored.

window.WORKSPACE = (function () {
  const now = Date.now();
  const HOUR = 3600 * 1000, DAY = 24 * HOUR;

  const docs = [
    {
      id: "doc-acme-v3",
      name: "Vendor MSA — Acme Corp",
      counterparty: "Acme Corp",
      type: "Master Services Agreement",
      version: 3,
      status: "complete",          // complete | uploading | streaming | error | all-clear
      uploadedBy: "Tomás Ferreira",
      updatedAt: now - 6 * HOUR,
      payload: "MOCK_PAYLOAD",     // resolves to window[payload]
      versions: [
        { v: 1, ts: now - 14 * DAY, source: "Acme legal", note: "Initial draft" },
        { v: 2, ts: now - 7 * DAY, source: "Veridict redline", note: "12 changes proposed" },
        { v: 3, ts: now - 2 * DAY, source: "Acme legal", note: "Counter-redline received" },
      ],
    },
    {
      id: "doc-northwind",
      name: "Order Form — Northwind",
      counterparty: "Northwind Traders",
      type: "Order Form",
      version: 1,
      status: "streaming",
      uploadedBy: "you",
      updatedAt: now - 2 * 60 * 1000,
      progress: { analysed: 6, total: 11 },
    },
    {
      id: "doc-globex-nda",
      name: "NDA — Globex Pharma",
      counterparty: "Globex Pharma",
      type: "Mutual NDA",
      version: 2,
      status: "all-clear",
      uploadedBy: "Priya Anand",
      updatedAt: now - 2 * DAY,
      summary: { clause_count: 8, analysed: 8, risky: 0, high: 0, medium: 0, low: 0 },
    },
    {
      id: "doc-initech",
      name: "DPA — Initech",
      counterparty: "Initech Ltd.",
      type: "Data Processing Addendum",
      version: 1,
      status: "uploading",
      uploadedBy: "you",
      updatedAt: now - 30 * 1000,
      progress: { uploaded: 0.62 },
    },
    {
      id: "doc-stark",
      name: "SOW #4 — Stark Industries",
      counterparty: "Stark Industries",
      type: "Statement of Work",
      version: 1,
      status: "error",
      uploadedBy: "Tomás Ferreira",
      updatedAt: now - 18 * HOUR,
      error: "PDF appears to be a scan; OCR confidence below threshold.",
    },
    {
      id: "doc-wayne",
      name: "Vendor MSA — Wayne Tech",
      counterparty: "Wayne Tech",
      type: "Master Services Agreement",
      version: 1,
      status: "complete",
      uploadedBy: "Priya Anand",
      updatedAt: now - 4 * DAY,
      summary: { clause_count: 22, analysed: 22, risky: 4, high: 1, medium: 2, low: 1 },
    },
  ];

  // Active doc resolves payload pointer
  for (const d of docs) {
    if (typeof d.payload === "string") d.payload = window[d.payload];
    if (!d.summary && d.payload) d.summary = d.payload.summary;
  }

  return { docs, defaultActive: "doc-acme-v3" };
})();

// Diff data — what changed between v2 and v3 of the Acme MSA.
window.VERSION_DIFF = {
  doc: "Vendor MSA — Acme Corp",
  from: { v: 2, label: "v2 · Veridict redline", ts: Date.now() - 7 * 86400 * 1000 },
  to:   { v: 3, label: "v3 · Acme counter",     ts: Date.now() - 2 * 86400 * 1000 },
  hunks: [
    {
      id: "h-001", clauseId: "c-002", section: "3. Term and Termination",
      kind: "accepted", riskBefore: "medium", riskAfter: "low",
      summary: "Acme accepted shorter renewal notice (90 → 60 days).",
      before: "…unless either party provides written notice of non-renewal at least ninety (90) days prior…",
      after:  "…unless either party provides written notice of non-renewal at least sixty (60) days prior…",
    },
    {
      id: "h-002", clauseId: "c-003", section: "4. Fees and Payment",
      kind: "partial", riskBefore: "high", riskAfter: "medium",
      summary: "Cap added at 8% (we asked 5% / CPI). No termination right yet.",
      before: "…increase fees by up to fifteen percent (15%) annually… with no cap on cumulative increases…",
      after:  "…increase fees by up to eight percent (8%) annually… provided that cumulative increases shall not exceed twenty-five percent (25%) over the Term…",
      open: ["No CPI peg", "No customer termination right on increase"],
    },
    {
      id: "h-003", clauseId: "c-006", section: "7. Limitation of Liability",
      kind: "rejected", riskBefore: "high", riskAfter: "high",
      summary: "Acme rejected 12-month cap; offered 6 months. IP carve-out accepted.",
      before: "…fees paid… in the three (3) months immediately preceding…",
      after:  "…fees paid… in the six (6) months immediately preceding… The foregoing cap shall not apply to Vendor's indemnification obligations.",
      open: ["Cap still below 12-mo norm", "Confidentiality + gross negligence not carved out"],
    },
    {
      id: "h-004", clauseId: "c-009", section: "10. Service Levels",
      kind: "accepted", riskBefore: "medium", riskAfter: "low",
      summary: "SLA raised to 99.9%; sole-remedy language struck.",
      before: "…availability of 99.5%… Customer's sole remedy…",
      after:  "…availability of 99.9%… service credits shall not be Customer's exclusive remedy…",
    },
    {
      id: "h-005", clauseId: "c-005", section: "6. Warranties",
      kind: "new-risk", riskBefore: null, riskAfter: "medium",
      summary: "Acme inserted a new disclaimer of fitness for particular purpose.",
      before: "(no equivalent language)",
      after:  "VENDOR FURTHER DISCLAIMS ANY WARRANTY OF FITNESS FOR A PARTICULAR PURPOSE OR NON-INFRINGEMENT BY THIRD-PARTY COMPONENTS.",
      open: ["New language — review"],
    },
  ],
};
