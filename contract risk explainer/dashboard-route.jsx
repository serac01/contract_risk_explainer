// Dashboard route — wraps RiskDashboard for the new shell, handles non-complete states.

function DashboardRoute({ doc, tweaks, onGoTo }) {
  const P = window.CRE.palettes[tweaks.palette];
  const F = window.CRE.fonts;

  if (doc.status === "streaming") return <StreamingState doc={doc} P={P} F={F} />;
  if (doc.status === "all-clear") return <AllClearState doc={doc} P={P} F={F} onGoTo={onGoTo} />;
  if (!doc.payload) return <DashboardEmpty doc={doc} P={P} F={F} />;
  return (
    <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
      <RiskDashboard tweaks={tweaks} />
    </div>
  );
}

function StreamingState({ doc, P, F }) {
  const p = doc.progress;
  const pct = Math.round((p.analysed / p.total) * 100);
  return (
    <div style={{ flex: 1, padding: "60px 32px", overflow: "auto" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{
          fontFamily: F.mono, fontSize: 10.5, color: P.muted,
          letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 12,
        }}>Analysing · live</div>
        <h1 style={{
          fontFamily: F.body, fontSize: 36, lineHeight: 1.15, letterSpacing: -0.6,
          fontWeight: 500, color: P.ink, margin: "0 0 12px",
        }}>{doc.name}</h1>
        <div style={{
          fontFamily: F.body, fontSize: 16, color: P.ink2, lineHeight: 1.55, marginBottom: 32,
        }}>
          Reading {p.total} clauses. {p.analysed} done, {p.total - p.analysed} to go — findings appear below as the model finishes each one.
        </div>

        <div style={{ height: 6, background: P.hair, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: P.ink, transition: "width .4s" }} />
        </div>
        <div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 11, color: P.muted }}>
          {pct}% · ~{Math.max(1, Math.round((p.total - p.analysed) * 4))}s remaining
        </div>

        <div style={{
          marginTop: 32, background: P.surface, border: `1px solid ${P.hair}`,
          display: "flex", flexDirection: "column", gap: 1,
        }}>
          {Array.from({ length: 8 }).map((_, i) => {
            const done = i < p.analysed;
            return (
              <div key={i} style={{
                padding: "12px 16px", display: "grid", gridTemplateColumns: "auto 1fr auto",
                gap: 14, alignItems: "center", borderTop: i ? `1px solid ${P.hair}` : "none",
              }}>
                <span style={{
                  fontFamily: F.mono, fontSize: 10, color: done ? P.low : P.muted,
                  width: 14, display: "inline-block",
                }}>{done ? "✓" : (i === p.analysed ? "◐" : "·")}</span>
                <div>
                  {done ? (
                    <Skeleton width={`${60 + (i % 3) * 10}%`} P={P} solid />
                  ) : (
                    <Skeleton width={`${50 + (i % 4) * 10}%`} P={P} pulsing={i === p.analysed} />
                  )}
                </div>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: P.muted }}>
                  {done ? `clause ${i + 1}` : (i === p.analysed ? "reading…" : "queued")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Skeleton({ width, P, pulsing, solid }) {
  return (
    <div style={{
      width, height: 11, borderRadius: 2,
      background: solid ? P.hair : P.hair + "70",
      opacity: pulsing ? 1 : 0.7,
      animation: pulsing ? "vd-pulse 1.4s ease-in-out infinite" : "none",
    }} />
  );
}

function AllClearState({ doc, P, F, onGoTo }) {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "60px 32px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{
          fontFamily: F.mono, fontSize: 10.5, color: P.low,
          letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 12,
        }}>All clear</div>
        <h1 style={{
          fontFamily: F.body, fontSize: 38, lineHeight: 1.12, letterSpacing: -0.8,
          fontWeight: 500, color: P.ink, margin: "0 0 12px", textWrap: "pretty",
        }}>
          No risky clauses found in <span style={{ fontStyle: "italic" }}>{doc.name}</span>.
        </h1>
        <div style={{
          fontFamily: F.body, fontSize: 16, color: P.ink2, lineHeight: 1.6, marginBottom: 32,
        }}>
          All {doc.summary.clause_count} clauses landed inside the playbook's standard positions. Nothing to redline; safe to send to signature.
        </div>

        <div style={{
          padding: "20px 22px", background: P.lowBg, border: `1px solid ${P.low}30`,
          borderLeft: `3px solid ${P.low}`, borderRadius: 3,
          display: "flex", alignItems: "center", gap: 18,
        }}>
          <div style={{ fontSize: 26, color: P.low }}>✓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 3 }}>Sent to playbook archive</div>
            <div style={{ fontFamily: F.mono, fontSize: 11, color: P.ink2, lineHeight: 1.5 }}>
              We'll re-scan automatically if either party uploads a new version.
            </div>
          </div>
          <button style={{
            padding: "6px 12px", border: `1px solid ${P.low}60`, background: "transparent",
            color: P.low, borderRadius: 3, cursor: "pointer", fontSize: 11.5, fontWeight: 600,
          }} onClick={() => onGoTo("share")}>Share & sign →</button>
        </div>

        <div style={{ marginTop: 36 }}>
          <div style={{
            fontFamily: F.mono, fontSize: 10, color: P.muted, letterSpacing: 0.08,
            textTransform: "uppercase", fontWeight: 600, marginBottom: 10,
          }}>Clauses checked</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["Definitions","Term","Confidentiality","IP","Warranties","Liability","Indemnity","Governing law"].map((c) => (
              <span key={c} style={{
                padding: "3px 8px", borderRadius: 2, background: P.surface,
                border: `1px solid ${P.hair}`, fontFamily: window.CRE.fonts.ui, fontSize: 11.5, color: P.ink2,
              }}>✓ {c}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardEmpty({ doc, P, F }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <div style={{ fontFamily: F.mono, fontSize: 10.5, color: P.muted, marginBottom: 8 }}>
          NO ANALYSIS YET
        </div>
        <div style={{ fontFamily: F.body, fontSize: 22, color: P.ink, lineHeight: 1.3, marginBottom: 12 }}>
          Open this contract from the workspace, or upload a new one.
        </div>
      </div>
    </div>
  );
}

window.DashboardRoute = DashboardRoute;
