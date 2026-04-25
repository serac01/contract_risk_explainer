// Redline editor — git-diff-style review of suggested counter-language per finding.
// Left rail: list of risky clauses w/ playbook redline status (proposed/accepted/rejected).
// Center: side-by-side current text vs proposed redline, with hunk-level accept/reject.
// Right rail: status summary + send to counterparty.

const STORAGE_KEY_RL = "cre.redline.v1";

function useRedlineState() {
  const [state, setState] = React.useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RL);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { hunks: { "c-002": "proposed", "c-003": "proposed", "c-006": "proposed" } };
  });
  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY_RL, JSON.stringify(state)); } catch (_) {}
  }, [state]);
  const set = (id, v) => setState((s) => ({ ...s, hunks: { ...s.hunks, [id]: v } }));
  return [state, set];
}

function RedlineEditor({ doc, tweaks }) {
  const data = doc.payload;
  const PLAYBOOK = window.PLAYBOOK;
  const P = window.CRE.palettes[tweaks.palette];
  const F = window.CRE.fonts;

  const risky = data.clauses.filter((c) => c.analysis?.is_risky && PLAYBOOK[c.analysis.risk_category]);
  const [activeId, setActiveId] = React.useState(risky[0]?.id);
  const [state, setHunk] = useRedlineState();
  const active = risky.find((c) => c.id === activeId) || risky[0];

  const proposed = risky.filter((c) => state.hunks[c.id] === "proposed").length;
  const accepted = risky.filter((c) => state.hunks[c.id] === "accepted").length;
  const rejected = risky.filter((c) => state.hunks[c.id] === "rejected").length;

  return (
    <div style={{
      flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 280px",
      minHeight: 0, height: "100%", background: P.bg,
    }}>
      {/* Left: hunk list */}
      <div style={{
        borderRight: `1px solid ${P.hair}`, background: P.surface, overflow: "auto",
      }}>
        <div style={{
          padding: "16px 16px 10px", borderBottom: `1px solid ${P.hair}`, position: "sticky", top: 0,
          background: P.surface, zIndex: 1,
        }}>
          <div style={{
            fontFamily: F.mono, fontSize: 10, color: P.muted, letterSpacing: 0.08,
            textTransform: "uppercase", fontWeight: 600, marginBottom: 4,
          }}>Redlines</div>
          <div style={{ fontFamily: F.body, fontSize: 18, fontWeight: 500, color: P.ink, letterSpacing: -0.3 }}>
            {risky.length} hunks
          </div>
          <div style={{ marginTop: 6, fontFamily: F.mono, fontSize: 10.5, color: P.muted, lineHeight: 1.6 }}>
            <span style={{ color: P.med, fontWeight: 600 }}>{proposed}</span> proposed ·{" "}
            <span style={{ color: P.low, fontWeight: 600 }}>{accepted}</span> accepted ·{" "}
            <span>{rejected}</span> rejected
          </div>
        </div>
        {risky.map((c, i) => {
          const a = c.analysis;
          const lc = window.CRE.levelColor(a.risk_level, P);
          const status = state.hunks[c.id];
          const isActive = c.id === activeId;
          return (
            <div key={c.id} onClick={() => setActiveId(c.id)}
              style={{
                padding: "12px 14px", cursor: "pointer", borderBottom: `1px solid ${P.hair}`,
                borderLeft: `3px solid ${isActive ? lc.fg : "transparent"}`,
                background: isActive ? P.bg : "transparent",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ fontFamily: F.mono, fontSize: 10, color: P.muted }}>
                  #{String(i + 1).padStart(2, "0")}
                </span>
                <span style={{
                  padding: "1px 5px", borderRadius: 2, background: lc.bg, color: lc.fg,
                  fontFamily: F.mono, fontSize: 9, fontWeight: 600,
                  letterSpacing: 0.06, textTransform: "uppercase",
                }}>{a.risk_level}</span>
                <HunkStatusBadge status={status} P={P} F={F} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 12.5, color: P.ink, marginBottom: 2 }}>
                {c.section_title.replace(/^\d+\.\s*/, "")}
              </div>
              <div style={{
                fontFamily: F.body, fontSize: 12.5, color: P.ink2, lineHeight: 1.4,
                overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              }}>{a.short_rationale}</div>
            </div>
          );
        })}
      </div>

      {/* Center: diff */}
      <div style={{ overflow: "auto" }}>
        {active && (
          <RedlineHunk clause={active}
            playbook={PLAYBOOK[active.analysis.risk_category]}
            status={state.hunks[active.id]}
            onAction={(s) => setHunk(active.id, s)}
            P={P} F={F} />
        )}
      </div>

      {/* Right: send/status */}
      <div style={{
        borderLeft: `1px solid ${P.hair}`, background: P.surface, overflow: "auto", padding: 18,
      }}>
        <div style={{
          fontFamily: F.mono, fontSize: 10, color: P.muted, letterSpacing: 0.08,
          textTransform: "uppercase", fontWeight: 600, marginBottom: 10,
        }}>Redline package</div>

        <div style={{
          padding: "12px 14px", background: P.bg, borderRadius: 3,
          border: `1px solid ${P.hair}`, marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: P.ink2, fontWeight: 500 }}>To send</span>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: P.med, fontWeight: 600 }}>{proposed}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: P.ink2, fontWeight: 500 }}>Internal accept</span>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: P.low, fontWeight: 600 }}>{accepted}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: P.ink2, fontWeight: 500 }}>Drop</span>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: P.muted, fontWeight: 600 }}>{rejected}</span>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontFamily: F.mono, fontSize: 10, color: P.muted, letterSpacing: 0.08,
            textTransform: "uppercase", fontWeight: 600, marginBottom: 8,
          }}>Send to</div>
          <div style={{
            padding: "8px 10px", background: P.bg, border: `1px solid ${P.hair}`,
            borderRadius: 3, fontSize: 12, color: P.ink, marginBottom: 6,
          }}>legal@acme.example</div>
          <div style={{ fontFamily: F.mono, fontSize: 10.5, color: P.muted, lineHeight: 1.55 }}>
            Generates a Word doc with tracked changes + a cover memo summarising the {proposed} requested changes.
          </div>
        </div>

        <button style={{ ...btnSolid2(P), width: "100%", marginBottom: 6 }}>
          Generate redline package
        </button>
        <button style={{ ...btnGhost2(P), width: "100%" }}>
          Preview cover memo
        </button>

        <div style={{
          marginTop: 24, padding: "10px 12px", background: P.bg, borderRadius: 3,
          fontFamily: F.mono, fontSize: 10.5, color: P.muted, lineHeight: 1.6,
        }}>
          ↪ Last sent <span style={{ color: P.ink2 }}>v2</span><br />
          to Acme legal · 7 days ago<br />
          counter-redline received as v3
        </div>
      </div>
    </div>
  );
}

function HunkStatusBadge({ status, P, F }) {
  const st = {
    proposed: { fg: P.med, bg: P.medBg, label: "Proposed" },
    accepted: { fg: P.low, bg: P.lowBg, label: "Accepted" },
    rejected: { fg: P.muted, bg: P.hair, label: "Dropped" },
  }[status];
  if (!st) return null;
  return (
    <span style={{
      padding: "1px 5px", borderRadius: 2, background: st.bg, color: st.fg,
      fontFamily: F.mono, fontSize: 9, fontWeight: 600,
      letterSpacing: 0.06, textTransform: "uppercase",
    }}>{st.label}</span>
  );
}

function RedlineHunk({ clause, playbook, status, onAction, P, F }) {
  const a = clause.analysis;
  const lc = window.CRE.levelColor(a.risk_level, P);
  return (
    <div style={{ padding: "28px 32px", maxWidth: 980, margin: "0 auto" }}>
      <div style={{ marginBottom: 8 }}>
        <span style={{
          padding: "2px 6px", borderRadius: 2, background: lc.bg, color: lc.fg,
          fontFamily: F.mono, fontSize: 10, fontWeight: 600,
          letterSpacing: 0.08, textTransform: "uppercase", marginRight: 8,
        }}>{a.risk_level}</span>
        <span style={{ fontFamily: F.mono, fontSize: 10.5, color: P.muted }}>
          {clause.section_title}
        </span>
      </div>

      <h2 style={{
        fontFamily: F.body, fontSize: 26, lineHeight: 1.2, letterSpacing: -0.5,
        fontWeight: 500, color: P.ink, margin: "0 0 18px",
      }}>
        {playbook.severity}
        <span style={{ display: "block", fontSize: 16, color: P.ink2, marginTop: 6, fontStyle: "italic" }}>
          {a.short_rationale}
        </span>
      </h2>

      {/* Standard position callout */}
      <div style={{
        padding: "12px 16px", background: P.surface, borderLeft: `2px solid ${lc.fg}`,
        marginBottom: 24, borderRadius: 2,
      }}>
        <div style={{
          fontFamily: F.mono, fontSize: 9.5, color: P.muted, letterSpacing: 0.08,
          textTransform: "uppercase", fontWeight: 600, marginBottom: 6,
        }}>Playbook · standard position</div>
        <div style={{ fontFamily: F.body, fontSize: 14.5, lineHeight: 1.55, color: P.ink2 }}>
          {playbook.standard}
        </div>
      </div>

      {/* Diff */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
        background: P.hair, border: `1px solid ${P.hair}`,
      }}>
        <DiffSide
          label="As drafted by Acme"
          tag="–"
          tagColor={P.high}
          text={clause.text}
          P={P} F={F}
        />
        <DiffSide
          label="Proposed redline"
          tag="+"
          tagColor={P.low}
          text={null}
          rich={<RedlineRich text={playbook.redline} P={P} />}
          P={P} F={F}
        />
      </div>

      {/* Actions */}
      <div style={{
        marginTop: 18, padding: "12px 16px", background: P.surface,
        border: `1px solid ${P.hair}`, borderRadius: 3,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontFamily: F.mono, fontSize: 11, color: P.muted, marginRight: 4 }}>
          Hunk action
        </span>
        <button onClick={() => onAction("proposed")}
          style={{ ...hunkBtn(P, F), ...(status === "proposed" ? activeBtn(P.med, "#fff") : {}) }}>
          Propose ↗
        </button>
        <button onClick={() => onAction("accepted")}
          style={{ ...hunkBtn(P, F), ...(status === "accepted" ? activeBtn(P.low, "#fff") : {}) }}>
          ✓ Accept as-is
        </button>
        <button onClick={() => onAction("rejected")}
          style={{ ...hunkBtn(P, F), ...(status === "rejected" ? activeBtn(P.ink2, P.bg) : {}) }}>
          ✕ Drop
        </button>
        <div style={{ flex: 1 }} />
        <button style={{ ...btnGhost2(P), fontSize: 11 }}>Edit redline</button>
      </div>
    </div>
  );
}

function DiffSide({ label, tag, tagColor, text, rich, P, F }) {
  return (
    <div style={{ background: P.surface, padding: "14px 18px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
      }}>
        <span style={{
          width: 16, height: 16, borderRadius: 2, background: tagColor + "22",
          color: tagColor, display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: F.mono, fontSize: 11, fontWeight: 700,
        }}>{tag}</span>
        <span style={{
          fontFamily: F.mono, fontSize: 10, color: P.muted,
          letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600,
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: F.body, fontSize: 14, lineHeight: 1.65, color: P.ink2,
      }}>
        {rich || `“${text}”`}
      </div>
    </div>
  );
}

function RedlineRich({ text, P }) {
  const parts = []; let key = 0;
  const matches = [];
  let m;
  const boldRe = /\*\*([^*]+)\*\*/g;
  const strikeRe = /~~([^~]+)~~/g;
  while ((m = boldRe.exec(text)) !== null) matches.push({ s: m.index, e: m.index + m[0].length, body: m[1], kind: "bold" });
  while ((m = strikeRe.exec(text)) !== null) matches.push({ s: m.index, e: m.index + m[0].length, body: m[1], kind: "strike" });
  matches.sort((a, b) => a.s - b.s);
  let i = 0;
  for (const mt of matches) {
    if (mt.s > i) parts.push(<span key={key++}>{text.slice(i, mt.s)}</span>);
    if (mt.kind === "bold")
      parts.push(<span key={key++} style={{ background: P.lowBg, color: P.low, fontWeight: 600, padding: "0 2px", borderRadius: 1 }}>{mt.body}</span>);
    else
      parts.push(<span key={key++} style={{ textDecoration: "line-through", color: P.high, opacity: 0.75 }}>{mt.body}</span>);
    i = mt.e;
  }
  if (i < text.length) parts.push(<span key={key++}>{text.slice(i)}</span>);
  return <>“{parts}”</>;
}

function hunkBtn(P, F) {
  return {
    padding: "5px 10px", fontSize: 11.5, fontFamily: F.ui, fontWeight: 500,
    background: "transparent", color: P.ink2,
    border: `1px solid ${P.hair}`, borderRadius: 3, cursor: "pointer",
  };
}
function activeBtn(bg, fg) { return { background: bg, color: fg, borderColor: bg }; }
function btnGhost2(P) {
  return {
    padding: "6px 11px", fontSize: 11.5, fontFamily: window.CRE.fonts.ui, fontWeight: 500,
    background: "transparent", color: P.ink2,
    border: `1px solid ${P.hair}`, borderRadius: 3, cursor: "pointer",
  };
}
function btnSolid2(P) {
  return {
    padding: "8px 14px", fontSize: 12, fontFamily: window.CRE.fonts.ui, fontWeight: 500,
    background: P.ink, color: P.bg,
    border: `1px solid ${P.ink}`, borderRadius: 3, cursor: "pointer",
  };
}

window.RedlineEditor = RedlineEditor;
