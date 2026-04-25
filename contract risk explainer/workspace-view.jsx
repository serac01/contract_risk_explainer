// Workspace — portfolio of contracts. Each row shows status, risk rollup, last updated.
// Empty state, upload affordance, and per-status visual treatment.

function WorkspaceView({ docs, activeDocId, onOpen, P, F }) {
  const [filter, setFilter] = React.useState("all");
  const filtered = docs.filter((d) => {
    if (filter === "all") return true;
    if (filter === "in-progress") return d.status === "uploading" || d.status === "streaming";
    if (filter === "needs-review") return d.status === "complete" && (d.summary?.risky || 0) > 0;
    if (filter === "clean") return d.status === "all-clear";
    if (filter === "errors") return d.status === "error";
    return true;
  });

  const counts = {
    all: docs.length,
    "in-progress": docs.filter((d) => d.status === "uploading" || d.status === "streaming").length,
    "needs-review": docs.filter((d) => d.status === "complete" && (d.summary?.risky || 0) > 0).length,
    clean: docs.filter((d) => d.status === "all-clear").length,
    errors: docs.filter((d) => d.status === "error").length,
  };

  const portfolioRisky = docs.reduce((s, d) => s + (d.summary?.risky || 0), 0);
  const portfolioHigh = docs.reduce((s, d) => s + (d.summary?.high || 0), 0);

  return (
    <div style={{ flex: 1, overflow: "auto", background: P.bg }}>
      <div style={{ padding: "32px 36px 16px", maxWidth: 1180, margin: "0 auto" }}>
        <div style={{
          fontFamily: F.mono, fontSize: 10.5, color: P.muted,
          letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600,
          marginBottom: 12,
        }}>Workspace</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 28, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <h1 style={{
              fontFamily: F.body, fontSize: 36, lineHeight: 1.1, letterSpacing: -0.8,
              color: P.ink, fontWeight: 500, margin: 0, textWrap: "pretty",
            }}>
              {portfolioHigh > 0
                ? <>You have <span style={{ color: P.high, fontStyle: "italic" }}>{portfolioHigh} high-risk</span> finding{portfolioHigh === 1 ? "" : "s"} across {counts["needs-review"]} contract{counts["needs-review"] === 1 ? "" : "s"}.</>
                : <>All caught up — {counts["needs-review"]} contracts under review.</>}
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnGhost(P)}>Invite teammate</button>
            <button style={btnSolid(P)}>＋ Upload contract</button>
          </div>
        </div>

        <PortfolioStrip docs={docs} P={P} F={F} />

        <div style={{ display: "flex", gap: 6, marginTop: 24, flexWrap: "wrap" }}>
          {[
            ["all", "All"],
            ["needs-review", "Needs review"],
            ["in-progress", "In progress"],
            ["clean", "All clear"],
            ["errors", "Errors"],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={chipStyleLocal(P, F, filter === k)}>
              {l} <span style={{ opacity: 0.55, marginLeft: 3, fontVariantNumeric: "tabular-nums" }}>{counts[k]}</span>
            </button>
          ))}
        </div>

        <div style={{
          marginTop: 14, background: P.hair, border: `1px solid ${P.hair}`,
          display: "flex", flexDirection: "column", gap: 1,
        }}>
          {/* Header row */}
          <div style={{
            background: P.surface, padding: "8px 16px",
            display: "grid", gridTemplateColumns: "1fr 110px 200px 120px 120px 90px",
            gap: 14, alignItems: "center",
            fontFamily: F.mono, fontSize: 10, color: P.muted,
            letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600,
          }}>
            <div>Contract</div>
            <div>Status</div>
            <div>Risk</div>
            <div>Owner</div>
            <div>Updated</div>
            <div></div>
          </div>
          {filtered.map((d) => (
            <DocRow key={d.id} doc={d} active={d.id === activeDocId}
              onOpen={() => onOpen(d.id)} P={P} F={F} />
          ))}
          {filtered.length === 0 && (
            <div style={{
              background: P.surface, padding: "48px 16px", textAlign: "center",
              fontFamily: F.mono, fontSize: 12, color: P.muted,
            }}>No contracts in this view.</div>
          )}
        </div>

        <UploadCard P={P} F={F} />
      </div>
    </div>
  );
}

function PortfolioStrip({ docs, P, F }) {
  let high = 0, medium = 0, low = 0, ok = 0, pending = 0;
  for (const d of docs) {
    if (d.summary) {
      high += d.summary.high || 0;
      medium += d.summary.medium || 0;
      low += d.summary.low || 0;
      ok += (d.summary.clause_count || 0) - (d.summary.risky || 0);
    } else {
      pending++;
    }
  }
  const segs = [
    { key: "high", n: high, fg: P.high, label: "High" },
    { key: "med", n: medium, fg: P.med, label: "Med" },
    { key: "low", n: low, fg: P.low, label: "Low" },
    { key: "ok", n: ok, fg: P.muted, label: "OK clauses" },
  ];
  const total = segs.reduce((s, x) => s + x.n, 0);
  return (
    <div style={{
      padding: "16px 18px", background: P.surface, border: `1px solid ${P.hair}`,
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24,
    }}>
      <div>
        <div style={{
          fontFamily: F.mono, fontSize: 10, color: P.muted, letterSpacing: 0.08,
          textTransform: "uppercase", fontWeight: 600, marginBottom: 6,
        }}>Portfolio risk</div>
        <div style={{ display: "flex", height: 8, gap: 2 }}>
          {segs.map((s) => (
            <div key={s.key} title={`${s.label} ${s.n}`}
              style={{ flex: s.n, background: s.fg, minWidth: s.n ? 6 : 0 }} />
          ))}
        </div>
        <div style={{ marginTop: 6, fontFamily: F.mono, fontSize: 10.5, color: P.muted }}>
          {total} clauses across {docs.length - pending} analysed contract{docs.length - pending === 1 ? "" : "s"}
        </div>
      </div>
      <Stat2 label="High-risk findings" value={high} accent={high > 0 ? P.high : null} P={P} F={F} />
      <Stat2 label="In progress" value={pending} accent={pending > 0 ? P.med : null} P={P} F={F} />
      <Stat2 label="Awaiting counterparty" value={1} P={P} F={F} />
    </div>
  );
}

function Stat2({ label, value, accent, P, F }) {
  return (
    <div>
      <div style={{
        fontFamily: F.mono, fontSize: 10, color: P.muted, letterSpacing: 0.08,
        textTransform: "uppercase", fontWeight: 600, marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: F.body, fontSize: 28, color: accent || P.ink,
        letterSpacing: -0.6, fontVariantNumeric: "tabular-nums", lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}

function DocRow({ doc, active, onOpen, P, F }) {
  const status = STATUS_META(doc.status, P);
  const isActionable = doc.status !== "uploading";
  return (
    <div onClick={() => isActionable && onOpen()}
      style={{
        background: active ? P.hair + "60" : P.surface,
        padding: "14px 16px", cursor: isActionable ? "pointer" : "default",
        display: "grid", gridTemplateColumns: "1fr 110px 200px 120px 120px 90px",
        gap: 14, alignItems: "center",
      }}
      onMouseEnter={(e) => { if (isActionable) e.currentTarget.style.background = P.hair + "60"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = active ? P.hair + "60" : P.surface; }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 13.5, color: P.ink }}>{doc.name}</span>
          <span style={{
            padding: "1px 5px", borderRadius: 2, background: P.hair,
            fontFamily: F.mono, fontSize: 9.5, color: P.ink2, fontWeight: 600,
          }}>v{doc.version}</span>
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 10.5, color: P.muted }}>
          {doc.type} · {doc.counterparty}
        </div>
      </div>
      <div>
        <span style={{
          padding: "2px 7px", borderRadius: 2, background: status.bg, color: status.fg,
          fontFamily: F.mono, fontSize: 9.5, fontWeight: 600,
          letterSpacing: 0.06, textTransform: "uppercase", whiteSpace: "nowrap",
        }}>{status.dot} {status.label}</span>
      </div>
      <div>
        <RiskMini doc={doc} P={P} F={F} />
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 11, color: P.ink2 }}>
        {doc.uploadedBy}
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 11, color: P.muted }}>
        {relativeTime2(doc.updatedAt)}
      </div>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontFamily: F.mono, fontSize: 11, color: isActionable ? P.ink2 : P.muted }}>
          {isActionable ? "Open →" : "—"}
        </span>
      </div>
    </div>
  );
}

function RiskMini({ doc, P, F }) {
  if (doc.status === "uploading") {
    return (
      <div>
        <div style={{
          width: "100%", height: 4, background: P.hair, borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${(doc.progress?.uploaded || 0) * 100}%`,
            background: P.ink, transition: "width 0.4s",
          }} />
        </div>
        <div style={{ marginTop: 4, fontFamily: F.mono, fontSize: 10, color: P.muted }}>
          uploading {Math.round((doc.progress?.uploaded || 0) * 100)}%
        </div>
      </div>
    );
  }
  if (doc.status === "streaming") {
    const p = doc.progress;
    return (
      <div>
        <div style={{
          width: "100%", height: 4, background: P.hair, borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{ height: "100%", width: `${(p.analysed / p.total) * 100}%`, background: P.med }} />
        </div>
        <div style={{ marginTop: 4, fontFamily: F.mono, fontSize: 10, color: P.muted }}>
          analysing {p.analysed}/{p.total} clauses…
        </div>
      </div>
    );
  }
  if (doc.status === "error") {
    return (
      <span style={{ fontFamily: F.mono, fontSize: 10.5, color: P.high, fontStyle: "italic" }}>
        {doc.error}
      </span>
    );
  }
  if (doc.status === "all-clear" || (doc.summary && doc.summary.risky === 0)) {
    return (
      <span style={{ fontFamily: F.mono, fontSize: 11, color: P.low, fontWeight: 600 }}>
        ✓ market-standard
      </span>
    );
  }
  const s = doc.summary;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <RiskBarMini summary={s} P={P} />
      <span style={{ fontFamily: F.mono, fontSize: 10.5, color: P.ink2 }}>
        {s.high > 0 && <><span style={{ color: P.high, fontWeight: 600 }}>{s.high}H</span> </>}
        {s.medium > 0 && <><span style={{ color: P.med, fontWeight: 600 }}>{s.medium}M</span> </>}
        {s.low > 0 && <span style={{ color: P.low, fontWeight: 600 }}>{s.low}L</span>}
      </span>
    </div>
  );
}

function RiskBarMini({ summary, P }) {
  const segs = [
    { n: summary.high, fg: P.high },
    { n: summary.medium, fg: P.med },
    { n: summary.low, fg: P.low },
    { n: summary.clause_count - summary.risky, fg: P.muted },
  ];
  return (
    <div style={{ display: "flex", height: 6, width: 80, borderRadius: 1, overflow: "hidden", gap: 1 }}>
      {segs.map((s, i) => s.n > 0 && (
        <div key={i} style={{ flex: s.n, background: s.fg, minWidth: 3 }} />
      ))}
    </div>
  );
}

function UploadCard({ P, F }) {
  return (
    <div style={{
      marginTop: 24, padding: "32px 24px", background: P.surface,
      border: `1px dashed ${P.hair}`, borderRadius: 4,
      display: "flex", alignItems: "center", gap: 18,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 4, background: P.hair, color: P.ink2,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F.body, fontSize: 22,
      }}>↑</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 3 }}>
          Upload a new contract
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: P.muted, lineHeight: 1.5 }}>
          PDF, DOCX, or text. Average analysis takes 45 seconds for a 20-page MSA.
        </div>
      </div>
      <button style={btnGhost(P)}>Browse files</button>
      <button style={btnSolid(P)}>Drop file here</button>
    </div>
  );
}

function STATUS_META(s, P) {
  if (s === "complete") return { label: "Reviewed", fg: P.ink2, bg: P.hair, dot: "○" };
  if (s === "streaming") return { label: "Analysing", fg: P.med, bg: P.medBg, dot: "◐" };
  if (s === "uploading") return { label: "Uploading", fg: P.ink2, bg: P.hair, dot: "◔" };
  if (s === "error") return { label: "Errored", fg: P.high, bg: P.highBg, dot: "✕" };
  if (s === "all-clear") return { label: "All clear", fg: P.low, bg: P.lowBg, dot: "✓" };
  return { label: s, fg: P.ink2, bg: P.hair, dot: "·" };
}

function relativeTime2(ts) {
  const dt = (Date.now() - ts) / 1000;
  if (dt < 60) return "just now";
  if (dt < 3600) return `${Math.floor(dt / 60)}m ago`;
  if (dt < 86400) return `${Math.floor(dt / 3600)}h ago`;
  return `${Math.floor(dt / 86400)}d ago`;
}

function chipStyleLocal(P, F, active) {
  return {
    padding: "4px 9px", fontSize: 11.5, fontFamily: F.ui,
    border: `1px solid ${active ? P.ink : P.hair}`,
    background: active ? P.ink : "transparent",
    color: active ? P.bg : P.ink2,
    borderRadius: 3, cursor: "pointer", fontWeight: 500,
  };
}

window.WorkspaceView = WorkspaceView;
