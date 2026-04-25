// Artboard 3 — Clause Stream
// Compact, dense, all-in-one feed. Each clause is a row with its own
// inline token-bar attribution. Designed for fast scanning by power users.
// Section headers float as sticky markers. Quick-keys for accept/dismiss.

function ClauseStream({ tweaks }) {
  const data = window.MOCK_PAYLOAD;
  const P = window.CRE.palettes[tweaks.palette];
  const D = window.CRE.densities[tweaks.density];
  const F = window.CRE.fonts;
  const showAttribution = tweaks.attribution;

  const [filter, setFilter] = React.useState("all");
  const [expandedId, setExpandedId] = React.useState("c-006");

  const errorMap = Object.fromEntries(data.errors.map((e) => [e.clause_id, e]));

  const visible = React.useMemo(() => {
    if (filter === "all") return data.clauses;
    if (filter === "risky") return data.clauses.filter((c) => c.analysis?.is_risky);
    return data.clauses.filter((c) => c.analysis?.risk_level === filter);
  }, [filter]);

  return (
    <div style={{
      fontFamily: F.ui,
      color: P.ink,
      background: P.bg,
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateRows: "auto auto 1fr",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 24px",
        borderBottom: `1px solid ${P.hair}`,
        background: P.surface,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 4, background: P.ink, color: P.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F.mono, fontSize: 11, fontWeight: 600,
        }}>§</div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>
          Vendor MSA — Acme Corp
        </div>
        <div style={{
          fontFamily: F.mono, fontSize: 10.5, color: P.muted,
          padding: "2px 6px", background: P.bg, borderRadius: 2,
        }}>v3</div>
        <div style={{ flex: 1 }} />
        <div style={{
          fontFamily: F.mono, fontSize: 10.5, color: P.muted,
        }}>
          {data.summary.analysed}/{data.summary.clause_count} analysed · {data.summary.risky} risky
        </div>
      </div>

      {/* Filter strip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        padding: "0 24px",
        background: P.surface,
        borderBottom: `1px solid ${P.hair}`,
        fontFamily: F.mono, fontSize: 11,
      }}>
        {[
          ["all", "All", data.summary.clause_count, P.ink],
          ["risky", "Risky", data.summary.risky, P.ink],
          ["high", "High", data.summary.high, P.high],
          ["medium", "Medium", data.summary.medium, P.med],
          ["low", "Low", data.summary.low, P.low],
        ].map(([k, label, n, color]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: "10px 14px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "inherit",
            color: filter === k ? P.ink : P.muted,
            fontWeight: filter === k ? 600 : 500,
            borderBottom: `2px solid ${filter === k ? color : "transparent"}`,
            display: "flex", alignItems: "center", gap: 6,
            marginBottom: -1,
          }}>
            <span>{label}</span>
            <span style={{
              color: P.muted, fontWeight: 400,
              fontVariantNumeric: "tabular-nums",
            }}>{n}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{
          color: P.muted, fontSize: 10.5,
          padding: "8px 0",
        }}>
          <kbd style={kbd(P, F)}>j</kbd>/<kbd style={kbd(P, F)}>k</kbd> nav · <kbd style={kbd(P, F)}>a</kbd> accept · <kbd style={kbd(P, F)}>d</kbd> dismiss
        </div>
      </div>

      {/* Stream */}
      <div style={{ overflow: "auto", padding: "12px 0 60px" }}>
        {visible.map((c) => (
          <ClauseRow key={c.id} clause={c}
            error={errorMap[c.id]}
            expanded={c.id === expandedId}
            onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
            P={P} F={F} D={D} showAttribution={showAttribution} />
        ))}
      </div>
    </div>
  );
}

function ClauseRow({ clause, error, expanded, onToggle, P, F, D, showAttribution }) {
  const a = clause.analysis;
  const lc = a ? window.CRE.levelColor(a.risk_level, P) : null;
  const num = clause.section_title?.match(/^(\d+)/)?.[1] || "·";

  return (
    <div style={{
      borderBottom: `1px solid ${P.hair}`,
      background: expanded ? P.surface : "transparent",
    }}>
      <div onClick={onToggle}
        style={{
          padding: "12px 24px",
          display: "grid",
          gridTemplateColumns: "28px 18px 200px 1fr 120px 80px",
          gap: 16, alignItems: "center",
          cursor: "pointer",
          fontFamily: F.mono, fontSize: 11.5,
        }}>
        <div style={{
          color: P.muted, fontVariantNumeric: "tabular-nums", textAlign: "right",
        }}>{num}</div>
        <div style={{ color: a?.is_risky ? lc.fg : P.muted, fontWeight: 600, fontSize: 12 }}>
          {a ? window.CRE.levelGlyph(a.risk_level) : error ? "⚠" : "·"}
        </div>
        <div style={{
          color: P.ink, fontFamily: F.ui, fontSize: 12.5, fontWeight: 500,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{clause.section_title?.replace(/^\d+\.\s*/, "")}</div>
        <div style={{
          color: a?.is_risky ? P.ink : P.muted, fontFamily: F.body, fontSize: 13.5,
          lineHeight: 1.4,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          fontStyle: a ? "normal" : "italic",
        }}>
          {a ? a.short_rationale :
            error ? "analysis failed" :
            clause.text.slice(0, 90) + "…"}
        </div>
        {a ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              padding: "1px 6px", borderRadius: 2,
              background: lc.bg, color: lc.fg,
              fontSize: 9.5, fontWeight: 600, letterSpacing: 0.08, textTransform: "uppercase",
            }}>{a.risk_category}</span>
          </div>
        ) : <div />}
        <div style={{
          color: P.muted, fontVariantNumeric: "tabular-nums", textAlign: "right",
        }}>{a ? window.CRE.pct(a.confidence) : "—"}</div>
      </div>

      {expanded && a && (
        <div style={{
          padding: "8px 24px 24px 86px",
          background: P.surface,
          borderTop: `1px dashed ${P.hair}`,
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 240px",
            gap: 28,
          }}>
            <div>
              <div style={{
                fontFamily: F.body, fontSize: 14.5, lineHeight: 1.6,
                color: P.ink, padding: "12px 0",
              }}>
                {a.top_tokens?.length && showAttribution
                  ? window.CRE.renderHeatmap(clause.text, a.top_tokens, lc.hl)
                  : clause.text}
              </div>
              <div style={{
                fontFamily: F.body, fontSize: 13.5, lineHeight: 1.6, color: P.ink2,
                paddingTop: 8, borderTop: `1px solid ${P.hair}`,
              }}>{a.rationale_text}</div>
              <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                <button style={btnGhost(P)}>Accept</button>
                <button style={btnGhost(P)}>Dismiss</button>
                <button style={btnGhost(P)}>Add note</button>
                <button style={btnGhost(P)}>↗ Compare to playbook</button>
              </div>
            </div>
            <div>
              <div style={{
                fontFamily: F.ui, fontSize: 10, letterSpacing: 0.08, textTransform: "uppercase",
                color: P.muted, fontWeight: 600, marginBottom: 8,
              }}>Top tokens</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 14 }}>
                {a.top_tokens.slice(0, 5).map((t, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "1fr 32px", gap: 8, alignItems: "center",
                  }}>
                    <div style={{ position: "relative", height: 18, background: P.bg }}>
                      <div style={{
                        position: "absolute", inset: 0,
                        width: `${(t.score / a.top_tokens[0].score) * 100}%`,
                        background: lc.hl,
                      }} />
                      <div style={{
                        position: "relative", padding: "1px 6px",
                        fontFamily: F.mono, fontSize: 10, color: P.ink,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{t.token}</div>
                    </div>
                    <div style={{
                      fontFamily: F.mono, fontSize: 10, color: P.muted,
                      fontVariantNumeric: "tabular-nums", textAlign: "right",
                    }}>{t.score.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div style={{
                fontFamily: F.mono, fontSize: 10.5, color: P.muted,
                lineHeight: 1.6,
              }}>
                <div>id <span style={{ color: P.ink2 }}>{clause.id}</span></div>
                <div>chars <span style={{ color: P.ink2 }}>{clause.char_start}–{clause.char_end}</span></div>
                <div>words <span style={{ color: P.ink2 }}>{clause.word_count}</span></div>
                <div>conf <span style={{ color: P.ink2 }}>{window.CRE.pct(a.confidence)}</span> · llm <span style={{ color: P.ink2 }}>{window.CRE.pct(a.llm_confidence)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {expanded && error && (
        <div style={{
          padding: "12px 24px 18px 86px",
          fontFamily: F.mono, fontSize: 11.5, color: P.muted,
          background: P.surface,
        }}>
          ⚠ {error.error}
          <button style={{ ...btnGhost(P), marginLeft: 12 }}>Re-run</button>
        </div>
      )}
    </div>
  );
}

function kbd(P, F) {
  return {
    fontFamily: F.mono,
    fontSize: 9.5,
    padding: "1px 5px",
    border: `1px solid ${P.hair}`,
    borderRadius: 2,
    background: P.bg,
    color: P.ink2,
    margin: "0 1px",
  };
}

window.ClauseStream = ClauseStream;
