// Risk Dashboard — primary surface (full app).
// Top: project header + summary hero (headline, distribution bar, stats)
// Mid: filters (status, category, search) + ranked findings, expandable inline
// Right rail (toggleable): Activity log
// Per-finding: full text with attribution, playbook + suggested redline, notes
// Decisions/notes persist to localStorage.

const STORAGE_KEY = "cre.review.v1";

function useReviewState() {
  const [state, setState] = React.useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      decisions: { "c-002": "accepted" },
      notes: {},
      activity: [{ id: 1, ts: Date.now() - 3600 * 1000 * 6, type: "accepted", clauseId: "c-002", who: "you" }],
    };
  });
  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }, [state]);
  const decide = (id, decision) => setState((s) => {
    if (s.decisions[id] === decision) {
      const next = { ...s.decisions };
      delete next[id];
      return { ...s, decisions: next, activity: [{ id: Date.now(), ts: Date.now(), type: "unresolved", clauseId: id, who: "you" }, ...s.activity] };
    }
    return { ...s, decisions: { ...s.decisions, [id]: decision }, activity: [{ id: Date.now(), ts: Date.now(), type: decision, clauseId: id, who: "you" }, ...s.activity] };
  });
  const addNote = (id, body) => setState((s) => ({
    ...s,
    notes: { ...s.notes, [id]: [...(s.notes[id] || []), { id: Date.now(), body, ts: Date.now(), who: "you" }] },
    activity: [{ id: Date.now() + 1, ts: Date.now(), type: "note", clauseId: id, who: "you", body }, ...s.activity],
  }));
  const reset = () => setState({ decisions: {}, notes: {}, activity: [] });
  return { state, decide, addNote, reset };
}

function RiskDashboard({ tweaks }) {
  const data = window.MOCK_PAYLOAD;
  const PLAYBOOK = window.PLAYBOOK;
  const CATEGORY_LABELS = window.CATEGORY_LABELS;
  const P = window.CRE.palettes[tweaks.palette];
  const D = window.CRE.densities[tweaks.density];
  const F = window.CRE.fonts;
  const showAttribution = tweaks.attribution;

  const [filter, setFilter] = React.useState("risky");
  const [categoryFilter, setCategoryFilter] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [activityOpen, setActivityOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState("c-006");

  const { state: review, decide, addNote, reset } = useReviewState();

  const errorMap = Object.fromEntries(data.errors.map((e) => [e.clause_id, e]));

  const categories = React.useMemo(() => {
    const seen = new Map();
    for (const c of data.clauses) {
      if (c.analysis?.is_risky && !seen.has(c.analysis.risk_category)) {
        seen.set(c.analysis.risk_category, {
          key: c.analysis.risk_category,
          label: CATEGORY_LABELS[c.analysis.risk_category] || c.analysis.risk_category,
          level: c.analysis.risk_level,
        });
      }
    }
    return Array.from(seen.values());
  }, []);

  const findings = React.useMemo(() => {
    let arr = data.clauses;
    if (filter === "risky") arr = arr.filter((c) => c.analysis?.is_risky);
    else if (filter === "open") arr = arr.filter((c) => c.analysis?.is_risky && !review.decisions[c.id]);
    else if (filter === "high" || filter === "medium" || filter === "low")
      arr = arr.filter((c) => c.analysis?.risk_level === filter);
    else if (filter === "accepted") arr = arr.filter((c) => review.decisions[c.id] === "accepted");
    else if (filter === "dismissed") arr = arr.filter((c) => review.decisions[c.id] === "dismissed");
    if (categoryFilter) arr = arr.filter((c) => c.analysis?.risk_category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((c) =>
        c.text.toLowerCase().includes(q) ||
        c.section_title?.toLowerCase().includes(q) ||
        c.analysis?.risk_category_label?.toLowerCase().includes(q)
      );
    }
    const order = { high: 0, medium: 1, low: 2 };
    return arr.sort((a, b) => {
      const al = a.analysis?.risk_level, bl = b.analysis?.risk_level;
      if (!al) return 1; if (!bl) return -1;
      return order[al] - order[bl];
    });
  }, [filter, categoryFilter, search, review.decisions]);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const accepted = Object.values(review.decisions).filter((d) => d === "accepted").length;
  const dismissed = Object.values(review.decisions).filter((d) => d === "dismissed").length;
  const open = data.clauses.filter((c) => c.analysis?.is_risky && !review.decisions[c.id]).length;

  return (
    <div style={{
      fontFamily: F.ui, color: P.ink, background: P.bg,
      width: "100%", height: "100%",
      display: "grid",
      gridTemplateColumns: activityOpen ? "1fr 320px" : "1fr",
      gridTemplateRows: "auto 1fr", overflow: "hidden", fontSize: D.fs,
    }}>
      <DashboardHeader
        data={data} review={review} accepted={accepted} dismissed={dismissed} open={open}
        onSearch={() => setSearchOpen(true)}
        activityOpen={activityOpen} onToggleActivity={() => setActivityOpen(!activityOpen)}
        P={P} F={F}
      />

      <div style={{ overflow: "auto" }}>
        {searchOpen && (
          <div style={{
            padding: "10px 32px", display: "flex", gap: 8, alignItems: "center",
            background: P.surface, borderBottom: `1px solid ${P.hair}`,
            position: "sticky", top: 0, zIndex: 5,
          }}>
            <span style={{ fontFamily: F.mono, fontSize: 11, color: P.muted }}>⌕</span>
            <input autoFocus value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clauses, sections, categories…"
              style={{
                flex: 1, border: "none", background: "transparent",
                fontFamily: F.body, fontSize: 14, color: P.ink, outline: "none",
              }} />
            <span style={{ fontFamily: F.mono, fontSize: 10.5, color: P.muted }}>
              {search.trim() ? `${findings.length} match${findings.length === 1 ? "" : "es"}` : ""}
            </span>
            <button style={btnGhost(P)} onClick={() => { setSearch(""); setSearchOpen(false); }}>esc</button>
          </div>
        )}

        <Hero data={data} accepted={accepted} dismissed={dismissed} open={open} P={P} F={F} />

        <div style={{ padding: "0 32px 24px", maxWidth: 1080, margin: "0 auto" }}>
          <FilterRow
            filter={filter} setFilter={setFilter}
            categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
            categories={categories}
            data={data} accepted={accepted} dismissed={dismissed} open={open}
            P={P} F={F}
          />

          <div style={{
            marginTop: 16,
            display: "flex", flexDirection: "column", gap: 1, background: P.hair,
            border: `1px solid ${P.hair}`,
          }}>
            {findings.length === 0 && (
              <div style={{
                background: P.surface, padding: "32px", textAlign: "center",
                fontFamily: F.mono, fontSize: 12, color: P.muted,
              }}>No findings match.</div>
            )}
            {findings.map((c, i) => (
              <FindingRow key={c.id}
                clause={c} index={i + 1}
                expanded={c.id === expandedId}
                onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                decision={review.decisions[c.id]}
                notes={review.notes[c.id] || []}
                onDecide={(d) => decide(c.id, d)}
                onAddNote={(b) => addNote(c.id, b)}
                playbook={c.analysis ? PLAYBOOK[c.analysis.risk_category] : null}
                search={search}
                P={P} F={F} D={D} showAttribution={showAttribution}
              />
            ))}
          </div>

          {data.errors.length > 0 && (
            <ErrorsCallout errors={data.errors} P={P} F={F} />
          )}
        </div>
      </div>

      {activityOpen && (
        <ActivityPanel
          activity={review.activity}
          clauses={data.clauses}
          onSelect={(id) => { setExpandedId(id); setFilter("all"); setCategoryFilter(null); }}
          onReset={reset}
          onClose={() => setActivityOpen(false)}
          P={P} F={F}
        />
      )}
    </div>
  );
}

// ── Header ──
function DashboardHeader({ data, review, accepted, dismissed, open, onSearch, activityOpen, onToggleActivity, P, F }) {
  const total = data.summary.risky;
  const reviewed = accepted + dismissed;
  return (
    <div style={{
      padding: "14px 32px",
      borderBottom: `1px solid ${P.hair}`,
      background: P.surface,
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 4, background: P.ink, color: P.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F.mono, fontSize: 11, fontWeight: 600,
      }}>§</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>Vendor MSA — Acme Corp</div>
        <div style={{ fontFamily: F.mono, fontSize: 10.5, color: P.muted, marginTop: 1 }}>
          analysis · 2026-04-25 · {data.summary.clause_count} clauses · {data.summary.risky} risky
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: F.mono, fontSize: 10.5, color: P.muted }}>review {reviewed}/{total}</span>
        <div style={{
          width: 80, height: 4, background: P.hair, borderRadius: 2, display: "flex", overflow: "hidden",
        }}>
          <div style={{ width: `${(accepted / Math.max(total, 1)) * 100}%`, background: P.low }} />
          <div style={{ width: `${(dismissed / Math.max(total, 1)) * 100}%`, background: P.muted }} />
        </div>
        <span style={{
          fontFamily: F.mono, fontSize: 10.5,
          color: open > 0 ? P.high : P.low, fontWeight: 600,
        }}>{open} open</span>
      </div>
      <div style={{ width: 1, height: 18, background: P.hair, margin: "0 4px" }} />
      <button style={btnGhost(P)} onClick={onSearch}>
        ⌕ <span style={{ marginLeft: 4, opacity: 0.5, fontFamily: F.mono, fontSize: 10 }}>⌘F</span>
      </button>
      <button
        style={{ ...btnGhost(P), ...(activityOpen ? { background: P.ink, color: P.bg, borderColor: P.ink } : {}) }}
        onClick={onToggleActivity}
      >Activity {review.activity.length > 0 && <span style={{ opacity: 0.6 }}>{review.activity.length}</span>}</button>
      <button style={btnGhost(P)}>Export PDF</button>
      <button style={btnSolid(P)}>Share findings</button>
    </div>
  );
}

// ── Hero ──
function Hero({ data, accepted, dismissed, open, P, F }) {
  // Build dynamic headline based on counts
  const high = data.summary.high, medium = data.summary.medium;
  return (
    <div style={{ padding: "36px 32px 24px", maxWidth: 1080, margin: "0 auto" }}>
      <div style={{
        fontFamily: F.mono, fontSize: 10.5, color: P.muted,
        letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600,
        marginBottom: 12,
      }}>Risk Briefing</div>
      <div style={{
        fontFamily: F.body, fontSize: 38, lineHeight: 1.15,
        letterSpacing: -0.8, color: P.ink, marginBottom: 8, maxWidth: 760,
        textWrap: "pretty",
      }}>
        {high} high-risk finding{high === 1 ? "" : "s"} centred on{" "}
        <span style={{ color: P.high, fontStyle: "italic" }}>fees</span> and{" "}
        <span style={{ color: P.high, fontStyle: "italic" }}>liability</span>;{" "}
        {medium} medium, {data.summary.low} low.
      </div>
      <div style={{
        fontFamily: F.body, fontSize: 16, lineHeight: 1.55, color: P.ink2,
        maxWidth: 680, marginBottom: 32,
      }}>
        The contract is broadly market, but the price-increase mechanism and liability cap are off-market and worth a redline before signature.
      </div>

      <RiskBar summary={data.summary} P={P} F={F} />

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
        marginTop: 32, background: P.hair, border: `1px solid ${P.hair}`,
      }}>
        <Stat label="Clauses analysed" value={`${data.summary.analysed} / ${data.summary.clause_count}`} P={P} F={F} />
        <Stat label="Open" value={open} accent={open > 0 ? P.high : P.low} P={P} F={F} />
        <Stat label="Accepted" value={accepted} accent={accepted > 0 ? P.low : null} P={P} F={F} />
        <Stat label="Errors" value={data.errors.length} accent={data.errors.length ? P.med : null} P={P} F={F} />
      </div>
    </div>
  );
}

function RiskBar({ summary, P, F }) {
  const segs = [
    { key: "high", n: summary.high, fg: P.high, label: "High" },
    { key: "medium", n: summary.medium, fg: P.med, label: "Med" },
    { key: "low", n: summary.low, fg: P.low, label: "Low" },
    { key: "ok", n: summary.clause_count - summary.risky, fg: P.muted, label: "OK" },
  ];
  return (
    <div>
      <div style={{ display: "flex", height: 10, gap: 2, borderRadius: 1, overflow: "hidden" }}>
        {segs.map((s) => (
          <div key={s.key} title={`${s.label} ${s.n}`} style={{
            flex: s.n, background: s.fg, minWidth: s.n ? 12 : 0,
          }} />
        ))}
      </div>
      <div style={{ display: "flex", marginTop: 8, gap: 18, fontFamily: F.mono, fontSize: 11 }}>
        {segs.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, background: s.fg, borderRadius: 1 }} />
            <span style={{ color: P.ink2, fontWeight: 600 }}>{s.label}</span>
            <span style={{ color: P.muted, fontVariantNumeric: "tabular-nums" }}>{s.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent, P, F }) {
  return (
    <div style={{ background: P.surface, padding: "16px 18px" }}>
      <div style={{
        fontFamily: F.mono, fontSize: 10, color: P.muted,
        letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600,
        marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontFamily: F.body, fontSize: 28, color: accent || P.ink,
        letterSpacing: -0.6, fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
    </div>
  );
}

// ── Filters ──
function FilterRow({ filter, setFilter, categoryFilter, setCategoryFilter, categories, data, accepted, dismissed, open, P, F }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
        <div style={{
          fontFamily: F.mono, fontSize: 10.5, color: P.muted,
          letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600,
        }}>Findings</div>
        <div style={{ fontFamily: F.body, fontSize: 22, color: P.ink, letterSpacing: -0.4 }}>
          Ranked by severity
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {[
          ["risky", `Risky ${data.summary.risky}`],
          ["open", `Open ${open}`],
          ["high", `High ${data.summary.high}`],
          ["medium", `Med ${data.summary.medium}`],
          ["low", `Low ${data.summary.low}`],
          ["accepted", `Accepted ${accepted}`],
          ["dismissed", `Dismissed ${dismissed}`],
          ["all", `All ${data.summary.clause_count}`],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} style={chipStyle(P, F, filter === k)}>{label}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{
          fontFamily: F.mono, fontSize: 10, color: P.muted,
          letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600,
          marginRight: 4,
        }}>category</span>
        <button onClick={() => setCategoryFilter(null)}
          style={chipStyle(P, F, categoryFilter === null)}>All</button>
        {categories.map((c) => {
          const lc = window.CRE.levelColor(c.level, P);
          const active = categoryFilter === c.key;
          return (
            <button key={c.key} onClick={() => setCategoryFilter(active ? null : c.key)}
              style={{
                ...chipStyle(P, F, active),
                ...(active ? {} : { borderColor: lc.bg, color: lc.fg, background: lc.bg + "60" }),
              }}>{c.label}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Finding row ──
function FindingRow({ clause, index, expanded, onToggle, decision, notes, onDecide, onAddNote, playbook, search, P, F, D, showAttribution }) {
  const a = clause.analysis;
  const lc = a ? window.CRE.levelColor(a.risk_level, P) : { fg: P.muted, bg: P.hair, hl: P.hair, wash: P.hair };
  const dimmed = decision === "dismissed";

  return (
    <div style={{ background: P.surface, opacity: dimmed ? 0.55 : 1, transition: "opacity .15s" }}>
      <div onClick={onToggle}
        style={{
          padding: "14px 18px",
          display: "grid",
          gridTemplateColumns: "32px 1fr auto auto auto",
          gap: 16, alignItems: "center", cursor: "pointer",
          borderLeft: `3px solid ${a ? lc.fg : P.muted}`,
        }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: P.muted, fontVariantNumeric: "tabular-nums" }}>
          #{String(index).padStart(2, "0")}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            {a ? (
              <span style={{
                padding: "2px 6px", borderRadius: 2, background: lc.bg, color: lc.fg,
                fontFamily: F.mono, fontSize: 9.5, fontWeight: 600,
                letterSpacing: 0.08, textTransform: "uppercase",
              }}>{a.risk_level}</span>
            ) : (
              <span style={{
                padding: "2px 6px", borderRadius: 2, background: P.hair, color: P.muted,
                fontFamily: F.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: 0.08, textTransform: "uppercase",
              }}>error</span>
            )}
            <span style={{ fontFamily: F.mono, fontSize: 10, color: P.muted, letterSpacing: 0.06 }}>
              {clause.section_title}
            </span>
            {decision && <DecisionBadge decision={decision} P={P} F={F} />}
            {notes.length > 0 && (
              <span style={{
                fontFamily: F.mono, fontSize: 9.5, color: P.ink2,
                padding: "1px 5px", background: P.hair + "80", borderRadius: 2,
              }}>{notes.length} note{notes.length === 1 ? "" : "s"}</span>
            )}
          </div>
          <div style={{
            fontFamily: F.body, fontSize: 16, color: P.ink, lineHeight: 1.3,
            letterSpacing: -0.2,
            textDecoration: decision === "dismissed" ? "line-through" : "none",
          }}>
            {a ? a.short_rationale : "Analysis unavailable for this clause."}
          </div>
        </div>
        <div style={{
          fontFamily: F.mono, fontSize: 10.5, color: P.muted,
          fontVariantNumeric: "tabular-nums", textAlign: "right",
        }}>
          {a ? (<>
            <div>conf {window.CRE.pct(a.confidence)}</div>
            <div style={{ marginTop: 2, fontSize: 9.5 }}>{a.top_tokens?.length || 0} tokens</div>
          </>) : "—"}
        </div>
        <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 4 }}>
          {a && (<>
            <button onClick={() => onDecide("accepted")}
              style={{ ...btnGhost(P), padding: "3px 8px", fontSize: 11,
                ...(decision === "accepted" ? { background: P.low, color: "#fff", borderColor: P.low } : {}) }}>✓</button>
            <button onClick={() => onDecide("dismissed")}
              style={{ ...btnGhost(P), padding: "3px 8px", fontSize: 11,
                ...(decision === "dismissed" ? { background: P.ink2, color: P.bg, borderColor: P.ink2 } : {}) }}>✕</button>
          </>)}
        </div>
        <div style={{ color: P.muted, fontFamily: F.mono, fontSize: 12, width: 12, textAlign: "center" }}>
          {expanded ? "−" : "+"}
        </div>
      </div>

      {expanded && a && (
        <FindingDetail
          clause={clause} a={a} lc={lc}
          decision={decision} notes={notes}
          onDecide={onDecide} onAddNote={onAddNote}
          playbook={playbook} search={search}
          P={P} F={F} D={D} showAttribution={showAttribution}
        />
      )}
      {expanded && !a && (
        <div style={{ padding: "12px 18px 18px 50px", fontFamily: F.mono, fontSize: 11.5, color: P.muted }}>
          ⚠ analysis failed
          <button style={{ ...btnGhost(P), marginLeft: 12 }}>Re-run</button>
        </div>
      )}
    </div>
  );
}

function FindingDetail({ clause, a, lc, decision, notes, onDecide, onAddNote, playbook, search, P, F, D, showAttribution }) {
  const [noteDraft, setNoteDraft] = React.useState("");
  const [showRedline, setShowRedline] = React.useState(true);
  const submit = () => {
    if (!noteDraft.trim()) return;
    onAddNote(noteDraft.trim());
    setNoteDraft("");
  };
  return (
    <div style={{
      padding: "0 18px 22px 50px",
      display: "grid", gridTemplateColumns: "1fr 280px", gap: 28,
      borderTop: `1px dashed ${P.hair}`,
      paddingTop: 16,
    }}>
      <div>
        {/* Clause text */}
        <div style={{
          fontFamily: F.body, fontSize: 14.5, lineHeight: 1.6, color: P.ink2,
          padding: "12px 16px", background: P.bg,
          borderLeft: `2px solid ${lc.fg}`, fontStyle: "italic", marginBottom: 14,
        }}>
          “{renderClauseText(clause, lc, search, showAttribution)}”
        </div>

        <div style={{ fontFamily: F.body, fontSize: 14.5, lineHeight: 1.6, color: P.ink2, marginBottom: 16 }}>
          {a.rationale_text}
        </div>

        {/* Playbook */}
        {playbook && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontFamily: F.mono, fontSize: 10, color: P.muted,
              letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600,
              marginBottom: 8,
            }}>Playbook · standard position</div>
            <div style={{
              padding: "10px 14px", background: P.bg, borderLeft: `2px solid ${lc.fg}`,
              fontFamily: F.body, fontSize: 13.5, lineHeight: 1.55, color: P.ink2,
            }}>
              <div style={{
                fontFamily: F.mono, fontSize: 10, color: lc.fg, fontWeight: 600,
                letterSpacing: 0.08, textTransform: "uppercase", marginBottom: 6,
              }}>{playbook.severity}</div>
              {playbook.standard}
            </div>
            <div style={{
              marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center",
              fontFamily: F.ui, fontSize: 11.5, color: P.muted,
            }}>
              <span>Suggested counter-language</span>
              <button onClick={() => setShowRedline(!showRedline)}
                style={{ ...btnGhost(P), padding: "2px 8px", fontSize: 10.5 }}>
                {showRedline ? "Hide" : "Show"}
              </button>
            </div>
            {showRedline && (
              <div style={{
                marginTop: 6, padding: "10px 14px", background: P.surface,
                border: `1px solid ${P.hair}`, borderRadius: 3,
                fontFamily: F.body, fontSize: 13.5, lineHeight: 1.6, color: P.ink2,
              }}>
                <Redline text={playbook.redline} P={P} />
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  <button style={btnGhost(P)}>Copy redline</button>
                  <button style={btnGhost(P)}>Insert into doc</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Decisions + actions */}
        <div style={{
          display: "flex", gap: 6, padding: "8px 10px", background: P.bg, borderRadius: 3, marginBottom: 16,
        }}>
          <button onClick={() => onDecide("accepted")}
            style={{ ...btnGhost(P), flex: 1,
              ...(decision === "accepted" ? { background: P.low, color: "#fff", borderColor: P.low } : {}) }}>
            ✓ Accept
          </button>
          <button onClick={() => onDecide("dismissed")}
            style={{ ...btnGhost(P), flex: 1,
              ...(decision === "dismissed" ? { background: P.ink2, color: P.bg, borderColor: P.ink2 } : {}) }}>
            ✕ Dismiss
          </button>
        </div>

        {/* Notes thread */}
        <div>
          <div style={{
            fontFamily: F.mono, fontSize: 10, color: P.muted,
            letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600,
            marginBottom: 8,
          }}>Notes {notes.length > 0 && `· ${notes.length}`}</div>
          {notes.map((n) => (
            <div key={n.id} style={{
              padding: "8px 10px", marginBottom: 6,
              background: P.bg, borderRadius: 3, borderLeft: `2px solid ${P.hair}`,
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                fontFamily: F.mono, fontSize: 9.5, color: P.muted, marginBottom: 3,
              }}>
                <span style={{ color: P.ink2, fontWeight: 600 }}>{n.who}</span>
                <span>{relativeTime(n.ts)}</span>
              </div>
              <div style={{ fontFamily: F.body, fontSize: 13.5, lineHeight: 1.5, color: P.ink }}>{n.body}</div>
            </div>
          ))}
          <textarea value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Add a note for the team…"
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); }}
            style={{
              width: "100%", minHeight: 56, resize: "vertical",
              padding: "8px 10px", border: `1px solid ${P.hair}`, borderRadius: 3,
              background: P.surface, color: P.ink,
              fontFamily: F.body, fontSize: 13.5, lineHeight: 1.5, outline: "none",
            }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: P.muted }}>⌘↵ to send</span>
            <button onClick={submit} disabled={!noteDraft.trim()}
              style={{ ...btnSolid(P), opacity: noteDraft.trim() ? 1 : 0.4, cursor: noteDraft.trim() ? "pointer" : "default" }}>
              Add note
            </button>
          </div>
        </div>
      </div>

      {/* Right column — confidence + tokens */}
      <div>
        <div style={{
          fontFamily: F.mono, fontSize: 10, color: P.muted,
          letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600,
          marginBottom: 8,
        }}>Confidence</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Metric label="LLM" value={window.CRE.pct(a.llm_confidence)} P={P} F={F} />
          <Metric label="Calibrated" value={window.CRE.pct(a.confidence)} P={P} F={F} />
        </div>
        <div style={{ height: 4, background: P.hair, borderRadius: 2, overflow: "hidden", marginTop: 8 }}>
          <div style={{ height: "100%", width: `${(a.confidence || 0) * 100}%`, background: P.ink }} />
        </div>

        {a.top_tokens?.length > 0 && (
          <>
            <div style={{
              fontFamily: F.mono, fontSize: 10, color: P.muted,
              letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600,
              marginTop: 18, marginBottom: 8,
            }}>Top tokens</div>
            {a.attribution?.output && (
              <div style={{
                fontFamily: F.mono, fontSize: 11, color: lc.fg,
                padding: "5px 8px", background: lc.bg, borderRadius: 3,
                marginBottom: 8, fontWeight: 500,
              }}>→ {a.attribution.output}</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {a.top_tokens.slice(0, 5).map((t, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 32px", gap: 8, alignItems: "center" }}>
                  <div style={{ position: "relative", height: 20, background: P.hair + "60" }}>
                    <div style={{
                      position: "absolute", inset: 0,
                      width: `${(t.score / a.top_tokens[0].score) * 100}%`,
                      background: lc.hl,
                    }} />
                    <div style={{
                      position: "relative", padding: "2px 7px",
                      fontFamily: F.mono, fontSize: 10.5, color: P.ink,
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
          </>
        )}
        <div style={{
          marginTop: 14, padding: "8px 10px", background: P.bg,
          fontFamily: F.mono, fontSize: 10.5, color: P.muted, lineHeight: 1.6,
        }}>
          id <span style={{ color: P.ink2 }}>{clause.id}</span><br />
          chars <span style={{ color: P.ink2 }}>{clause.char_start}–{clause.char_end}</span><br />
          words <span style={{ color: P.ink2 }}>{clause.word_count}</span>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──

function renderClauseText(c, lc, search, showAttribution) {
  const a = c.analysis;
  let segments;
  if (a?.top_tokens?.length && showAttribution) {
    segments = window.CRE.renderHeatmap(c.text, a.top_tokens, lc.hl);
  } else {
    segments = [c.text];
  }
  if (!search.trim()) return segments;
  const q = search.trim();
  const qLower = q.toLowerCase();
  const out = [];
  let key = 0;
  for (const seg of segments) {
    if (typeof seg !== "string") {
      out.push(React.cloneElement(seg, { key: `s${key++}` }));
      continue;
    }
    let i = 0;
    const lower = seg.toLowerCase();
    while (i < seg.length) {
      const idx = lower.indexOf(qLower, i);
      if (idx < 0) { out.push(seg.slice(i)); break; }
      if (idx > i) out.push(seg.slice(i, idx));
      out.push(
        React.createElement("mark", {
          key: `q${key++}`,
          style: { background: "#fde890", color: "inherit", padding: 0,
            outline: "1px solid #c79016", borderRadius: 1 },
        }, seg.slice(idx, idx + q.length))
      );
      i = idx + q.length;
    }
  }
  return out;
}

function Redline({ text, P }) {
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
      parts.push(<span key={key++} style={{ background: "#dde3d2", color: "#3a4a32", fontWeight: 600, padding: "0 2px" }}>{mt.body}</span>);
    else
      parts.push(<span key={key++} style={{ textDecoration: "line-through", color: P.muted, opacity: 0.7 }}>{mt.body}</span>);
    i = mt.e;
  }
  if (i < text.length) parts.push(<span key={key++}>{text.slice(i)}</span>);
  return <>{parts}</>;
}

function DecisionBadge({ decision, P, F }) {
  const styles = {
    accepted: { color: P.low, bg: P.lowBg, label: "✓ accepted" },
    dismissed: { color: P.muted, bg: P.hair, label: "✕ dismissed" },
  }[decision];
  if (!styles) return null;
  return (
    <span style={{
      padding: "1px 6px", borderRadius: 2,
      background: styles.bg, color: styles.color,
      fontFamily: F.mono, fontSize: 9, fontWeight: 600,
      letterSpacing: 0.04, textTransform: "uppercase",
    }}>{styles.label}</span>
  );
}

function Metric({ label, value, P, F }) {
  return (
    <div>
      <div style={{ fontFamily: F.mono, fontSize: 10, color: P.muted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: F.mono, fontSize: 18, color: P.ink, fontWeight: 500, fontVariantNumeric: "tabular-nums", letterSpacing: -0.4 }}>{value}</div>
    </div>
  );
}

function ErrorsCallout({ errors, P, F }) {
  return (
    <div style={{
      marginTop: 24, padding: 16, background: P.surface,
      border: `1px solid ${P.hair}`, borderLeft: `3px solid ${P.med}`,
      display: "flex", gap: 14, alignItems: "flex-start",
    }}>
      <div style={{ fontFamily: F.mono, fontSize: 13, color: P.med, fontWeight: 600 }}>⚠</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>
          {errors.length} clause{errors.length === 1 ? "" : "s"} could not be analysed
        </div>
        {errors.map((e) => (
          <div key={e.clause_id} style={{ fontFamily: F.mono, fontSize: 11, color: P.muted }}>
            <span style={{ color: P.ink2, fontWeight: 500 }}>{e.clause_id}</span> — {e.error}
          </div>
        ))}
        <button style={{ ...btnGhost(P), marginTop: 8 }}>Re-run analysis</button>
      </div>
    </div>
  );
}

function ActivityPanel({ activity, clauses, onSelect, onReset, onClose, P, F }) {
  const clauseMap = Object.fromEntries(clauses.map((c) => [c.id, c]));
  return (
    <div style={{
      gridRow: "1 / -1",
      borderLeft: `1px solid ${P.hair}`, background: P.surface,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 16px", display: "flex", alignItems: "center",
        borderBottom: `1px solid ${P.hair}`,
      }}>
        <div style={{ fontWeight: 600, fontSize: 12.5 }}>Activity</div>
        <div style={{ flex: 1 }} />
        <button onClick={onClose} style={{ ...btnGhost(P), padding: "2px 8px", fontSize: 11 }}>×</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {activity.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", fontFamily: F.mono, fontSize: 11, color: P.muted }}>
            No activity yet.
            <div style={{ marginTop: 4, fontSize: 10 }}>Accept, dismiss, or note findings to build a review log.</div>
          </div>
        )}
        {activity.map((ev) => {
          const c = clauseMap[ev.clauseId];
          const verb = {
            accepted: { label: "accepted", color: P.low },
            dismissed: { label: "dismissed", color: P.muted },
            unresolved: { label: "un-resolved", color: P.med },
            note: { label: "noted on", color: P.ink2 },
          }[ev.type];
          return (
            <div key={ev.id} onClick={() => onSelect(ev.clauseId)}
              style={{
                padding: "8px 16px", cursor: "pointer",
                borderLeft: `2px solid ${verb.color}`, marginBottom: 1,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = P.hair + "40"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <div style={{
                fontFamily: F.mono, fontSize: 9.5, color: P.muted, marginBottom: 2,
                display: "flex", justifyContent: "space-between",
              }}>
                <span><span style={{ color: P.ink2, fontWeight: 600 }}>{ev.who}</span> {verb.label}</span>
                <span>{relativeTime(ev.ts)}</span>
              </div>
              <div style={{ fontSize: 12, color: P.ink, fontWeight: 500 }}>
                {c?.section_title?.replace(/^\d+\.\s*/, "") || ev.clauseId}
              </div>
              {ev.body && (
                <div style={{
                  marginTop: 4, fontFamily: F.body, fontSize: 12.5, color: P.ink2,
                  lineHeight: 1.4, fontStyle: "italic",
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                }}>“{ev.body}”</div>
              )}
            </div>
          );
        })}
      </div>
      {activity.length > 0 && (
        <div style={{ padding: 12, borderTop: `1px solid ${P.hair}` }}>
          <button onClick={onReset} style={{ ...btnGhost(P), width: "100%" }}>Reset review</button>
        </div>
      )}
    </div>
  );
}

function relativeTime(ts) {
  const dt = (Date.now() - ts) / 1000;
  if (dt < 60) return "just now";
  if (dt < 3600) return `${Math.floor(dt / 60)}m ago`;
  if (dt < 86400) return `${Math.floor(dt / 3600)}h ago`;
  return `${Math.floor(dt / 86400)}d ago`;
}

function chipStyle(P, F, active) {
  return {
    padding: "4px 8px", fontSize: 11.5, fontFamily: F.ui,
    border: `1px solid ${active ? P.ink : P.hair}`,
    background: active ? P.ink : "transparent",
    color: active ? P.bg : P.ink2,
    borderRadius: 3, cursor: "pointer", fontWeight: 500,
  };
}
function btnGhost(P) {
  return {
    padding: "5px 10px", fontSize: 11.5,
    fontFamily: window.CRE.fonts.ui,
    background: "transparent", color: P.ink2,
    border: `1px solid ${P.hair}`, borderRadius: 3, cursor: "pointer", fontWeight: 500,
  };
}
function btnSolid(P) {
  return {
    padding: "5px 12px", fontSize: 11.5,
    fontFamily: window.CRE.fonts.ui,
    background: P.ink, color: P.bg,
    border: `1px solid ${P.ink}`, borderRadius: 3, cursor: "pointer", fontWeight: 500,
  };
}

window.RiskDashboard = RiskDashboard;
