// Artboard 1 — Document Reader (interactive)
// Three-pane: clause list (filterable + searchable) · contract body (heatmap, search highlights)
// · analysis panel with playbook + suggested redline + notes thread.
// Top-level review state (decisions, notes) persists to localStorage.

const STORAGE_KEY = "cre.review.v1";

function useReviewState() {
  const [state, setState] = React.useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    // Pre-seed: one accepted finding so the activity log isn't empty on first load.
    return {
      decisions: { "c-002": "accepted" }, // auto-renewal pre-accepted
      notes: {},
      activity: [
        { id: 1, ts: Date.now() - 3600 * 1000 * 6, type: "accepted", clauseId: "c-002", who: "you" },
      ],
    };
  });
  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }, [state]);

  const decide = (clauseId, decision) => setState((s) => {
    const prev = s.decisions[clauseId];
    if (prev === decision) {
      // toggle off
      const next = { ...s.decisions };
      delete next[clauseId];
      return {
        ...s,
        decisions: next,
        activity: [{ id: Date.now(), ts: Date.now(), type: "unresolved", clauseId, who: "you" }, ...s.activity],
      };
    }
    return {
      ...s,
      decisions: { ...s.decisions, [clauseId]: decision },
      activity: [{ id: Date.now(), ts: Date.now(), type: decision, clauseId, who: "you" }, ...s.activity],
    };
  });

  const addNote = (clauseId, body) => setState((s) => {
    const note = { id: Date.now(), body, ts: Date.now(), who: "you" };
    return {
      ...s,
      notes: { ...s.notes, [clauseId]: [...(s.notes[clauseId] || []), note] },
      activity: [{ id: Date.now() + 1, ts: Date.now(), type: "note", clauseId, who: "you", body }, ...s.activity],
    };
  });

  const reset = () => {
    setState({ decisions: {}, notes: {}, activity: [] });
  };

  return { state, decide, addNote, reset };
}

function DocumentReader({ tweaks }) {
  const data = window.MOCK_PAYLOAD;
  const PLAYBOOK = window.PLAYBOOK;
  const CATEGORY_LABELS = window.CATEGORY_LABELS;
  const P = window.CRE.palettes[tweaks.palette];
  const D = window.CRE.densities[tweaks.density];
  const F = window.CRE.fonts;
  const showAttribution = tweaks.attribution;

  const [selectedId, setSelectedId] = React.useState("c-006");
  const [filter, setFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState(null);
  const [hoverId, setHoverId] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [activityOpen, setActivityOpen] = React.useState(false);
  const bodyRef = React.useRef(null);
  const clauseRefs = React.useRef({});

  const { state: review, decide, addNote, reset } = useReviewState();

  const selected = data.clauses.find((c) => c.id === selectedId);
  const errorMap = Object.fromEntries(data.errors.map((e) => [e.clause_id, e]));

  // Distinct category list for chip row (only categories actually present)
  const categories = React.useMemo(() => {
    const seen = new Map();
    for (const c of data.clauses) {
      if (c.analysis && !seen.has(c.analysis.risk_category)) {
        seen.set(c.analysis.risk_category, {
          key: c.analysis.risk_category,
          label: CATEGORY_LABELS[c.analysis.risk_category] || c.analysis.risk_category,
          level: c.analysis.risk_level,
          risky: c.analysis.is_risky,
        });
      }
    }
    return Array.from(seen.values());
  }, []);

  const visible = React.useMemo(() => {
    let arr = data.clauses;
    if (filter === "risky") arr = arr.filter((c) => c.analysis?.is_risky);
    else if (filter === "open") arr = arr.filter((c) => c.analysis?.is_risky && !review.decisions[c.id]);
    else if (filter === "high" || filter === "medium" || filter === "low") {
      arr = arr.filter((c) => c.analysis?.risk_level === filter);
    } else if (filter === "accepted") arr = arr.filter((c) => review.decisions[c.id] === "accepted");
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
    return arr;
  }, [filter, categoryFilter, search, review.decisions]);

  React.useEffect(() => {
    const el = clauseRefs.current[selectedId];
    if (el && bodyRef.current) {
      const top = el.offsetTop - 80;
      bodyRef.current.scrollTo({ top, behavior: "smooth" });
    }
  }, [selectedId]);

  // Cmd/Ctrl-F → open search
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openCount = data.clauses.filter((c) => c.analysis?.is_risky && !review.decisions[c.id]).length;
  const acceptedCount = Object.values(review.decisions).filter((d) => d === "accepted").length;
  const dismissedCount = Object.values(review.decisions).filter((d) => d === "dismissed").length;

  const wrap = {
    fontFamily: F.ui,
    color: P.ink,
    background: P.bg,
    height: "100%", width: "100%",
    display: "grid",
    gridTemplateColumns: activityOpen ? "248px 1fr 360px 280px" : "248px 1fr 360px",
    gridTemplateRows: "auto auto 1fr",
    fontSize: D.fs,
    overflow: "hidden",
  };

  // ── Header ──
  const header = (
    <div style={{
      gridColumn: "1 / -1",
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 24px",
      borderBottom: `1px solid ${P.hair}`,
      background: P.surface,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 4, background: P.ink, color: P.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F.mono, fontSize: 11, fontWeight: 600,
        }}>§</div>
        <div style={{ fontWeight: 600, fontSize: 13.5, letterSpacing: -0.1 }}>
          Vendor MSA — Acme Corp <span style={{ color: P.muted, fontWeight: 400 }}>v3 redline</span>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <ReviewProgress data={data} acceptedCount={acceptedCount} dismissedCount={dismissedCount} openCount={openCount} P={P} F={F} />
      <div style={{ width: 1, height: 18, background: P.hair, margin: "0 4px" }} />
      <button style={btnGhost(P)} onClick={() => setSearchOpen(true)}>
        ⌕ <span style={{ marginLeft: 4, opacity: 0.5, fontFamily: F.mono, fontSize: 10 }}>⌘F</span>
      </button>
      <button
        style={{ ...btnGhost(P), ...(activityOpen ? { background: P.ink, color: P.bg, borderColor: P.ink } : {}) }}
        onClick={() => setActivityOpen(!activityOpen)}
      >
        Activity {review.activity.length > 0 && <span style={{ opacity: 0.6 }}>{review.activity.length}</span>}
      </button>
      <button style={btnSolid(P)}>Share findings</button>
    </div>
  );

  // ── Search bar (when open) ──
  const searchBar = searchOpen && (
    <div style={{
      gridColumn: "1 / -1",
      padding: "8px 24px", display: "flex", gap: 8, alignItems: "center",
      background: P.surface, borderBottom: `1px solid ${P.hair}`,
    }}>
      <span style={{ fontFamily: F.mono, fontSize: 11, color: P.muted }}>⌕</span>
      <input
        autoFocus value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search clauses, sections, or risk categories…"
        style={{
          flex: 1, border: "none", background: "transparent",
          fontFamily: F.body, fontSize: 14, color: P.ink, outline: "none",
        }} />
      <span style={{ fontFamily: F.mono, fontSize: 10.5, color: P.muted }}>
        {search.trim() ? `${visible.length} match${visible.length === 1 ? "" : "es"}` : ""}
      </span>
      <button style={btnGhost(P)} onClick={() => { setSearch(""); setSearchOpen(false); }}>esc</button>
    </div>
  );

  // ── Left: clause list w/ category facets ──
  const left = (
    <div style={{
      borderRight: `1px solid ${P.hair}`,
      background: P.surface, overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ padding: "14px 16px 8px" }}>
        <div style={{
          fontSize: 10.5, letterSpacing: 0.08, textTransform: "uppercase",
          color: P.muted, fontWeight: 600, marginBottom: 8,
        }}>Status</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {[
            ["all", `All ${data.summary.clause_count}`],
            ["open", `Open ${openCount}`],
            ["risky", `Risky ${data.summary.risky}`],
            ["accepted", `Accepted ${acceptedCount}`],
            ["dismissed", `Dismissed ${dismissedCount}`],
          ].map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={chipStyle(P, F, filter === k)}>{label}</button>
          ))}
        </div>
        <div style={{
          fontSize: 10.5, letterSpacing: 0.08, textTransform: "uppercase",
          color: P.muted, fontWeight: 600, marginBottom: 8,
        }}>Category</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          <button onClick={() => setCategoryFilter(null)}
            style={chipStyle(P, F, categoryFilter === null)}>All</button>
          {categories.filter((c) => c.risky).map((c) => {
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
      <div style={{ flex: 1, overflow: "auto", padding: "4px 8px 16px" }}>
        {visible.length === 0 && (
          <div style={{
            padding: "24px 12px", color: P.muted, fontFamily: F.mono, fontSize: 11,
            textAlign: "center",
          }}>No clauses match.</div>
        )}
        {visible.map((c) => (
          <ClauseListRow key={c.id} clause={c}
            isSelected={c.id === selectedId}
            isHovered={c.id === hoverId}
            decision={review.decisions[c.id]}
            noteCount={review.notes[c.id]?.length || 0}
            error={errorMap[c.id]}
            onClick={() => setSelectedId(c.id)}
            onHover={setHoverId}
            P={P} F={F} />
        ))}
      </div>
    </div>
  );

  // ── Center: document body ──
  const center = (
    <div ref={bodyRef} style={{ overflow: "auto", padding: "32px 56px 80px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{
          fontFamily: F.mono, fontSize: 10.5, color: P.muted,
          letterSpacing: 0.06, textTransform: "uppercase", marginBottom: 6,
        }}>Master Services Agreement · Exhibit A</div>
        <div style={{
          fontFamily: F.body, fontSize: 26, lineHeight: 1.2, color: P.ink,
          marginBottom: 36, letterSpacing: -0.4,
        }}>Between Acme Corp. and Vendor Co.</div>

        {data.clauses.map((c) => {
          const a = c.analysis;
          const sel = c.id === selectedId;
          const hov = c.id === hoverId;
          const lc = a ? window.CRE.levelColor(a.risk_level, P) : null;
          const decision = review.decisions[c.id];
          const showWash = a?.is_risky && !decision &&
            (sel || hov || filter === "risky" || filter === "open" || filter === a.risk_level);
          const dimmed = decision === "dismissed";
          return (
            <div key={c.id}
              ref={(el) => (clauseRefs.current[c.id] = el)}
              onClick={() => setSelectedId(c.id)}
              onMouseEnter={() => setHoverId(c.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                position: "relative",
                padding: `${D.row + 4}px 18px ${D.row + 4}px 24px`,
                marginBottom: D.gap,
                cursor: "pointer",
                background: showWash ? lc.wash : "transparent",
                borderLeft: `3px solid ${
                  sel ? (lc?.fg || P.ink) :
                  decision === "accepted" ? P.low :
                  decision === "dismissed" ? P.muted :
                  a?.is_risky ? lc.fg : "transparent"
                }`,
                opacity: dimmed ? 0.45 : 1,
                transition: "background 0.15s, opacity 0.15s",
              }}>
              {c.section_title && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  fontFamily: F.ui, fontSize: 10.5, color: P.muted,
                  letterSpacing: 0.08, textTransform: "uppercase",
                  fontWeight: 600, marginBottom: 6,
                }}>
                  <span>{c.section_title}</span>
                  {decision && <DecisionBadge decision={decision} P={P} F={F} />}
                  {review.notes[c.id]?.length > 0 && (
                    <span style={{
                      fontFamily: F.mono, fontSize: 10, color: P.ink2,
                      padding: "1px 5px", background: P.hair + "80", borderRadius: 2,
                      textTransform: "none", letterSpacing: 0,
                    }}>{review.notes[c.id].length} note{review.notes[c.id].length === 1 ? "" : "s"}</span>
                  )}
                </div>
              )}
              <div style={{
                fontFamily: F.body,
                fontSize: D.fsBody,
                lineHeight: D.lh,
                color: P.ink,
              }}>
                {renderClauseText(c, lc, search, showAttribution)}
              </div>
              {!a && errorMap[c.id] && (
                <div style={{
                  marginTop: 10, padding: "6px 10px",
                  fontFamily: F.mono, fontSize: 11, color: P.muted,
                  background: P.hair + "60",
                  border: `1px dashed ${P.hair}`, borderRadius: 3,
                }}>⚠ analysis unavailable — {errorMap[c.id].error}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Right: analysis panel (with playbook + redline + notes) ──
  const right = (
    <div style={{
      borderLeft: `1px solid ${P.hair}`,
      background: P.surface, overflow: "auto",
    }}>
      {selected ? (
        <AnalysisPanel
          clause={selected}
          decision={review.decisions[selected.id]}
          notes={review.notes[selected.id] || []}
          onDecide={(d) => decide(selected.id, d)}
          onAddNote={(body) => addNote(selected.id, body)}
          P={P} F={F} D={D} showAttribution={showAttribution}
          playbook={selected.analysis ? PLAYBOOK[selected.analysis.risk_category] : null}
        />
      ) : <div style={{ padding: 24, color: P.muted }}>Select a clause</div>}
    </div>
  );

  // ── Activity panel ──
  const activity = activityOpen && (
    <ActivityPanel
      activity={review.activity}
      clauses={data.clauses}
      onSelect={(id) => setSelectedId(id)}
      onReset={reset}
      onClose={() => setActivityOpen(false)}
      P={P} F={F}
    />
  );

  return (
    <div style={wrap}>
      {header}
      {searchBar}
      {left}{center}{right}{activity}
    </div>
  );
}

// ── Subcomponents ──

function renderClauseText(c, lc, search, showAttribution) {
  const a = c.analysis;
  // 1) pick base segments — heatmap if available, else single string
  let segments;
  if (a?.top_tokens?.length && showAttribution) {
    segments = window.CRE.renderHeatmap(c.text, a.top_tokens, lc.hl);
  } else {
    segments = [c.text];
  }
  // 2) overlay search highlights via simple split on string segments only
  if (!search.trim()) return segments;
  const q = search.trim();
  const qLower = q.toLowerCase();
  const out = [];
  let key = 0;
  for (const seg of segments) {
    if (typeof seg !== "string") {
      // Don't recurse into <mark> nodes — search just won't highlight
      // text already inside an attribution mark, which is acceptable.
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
          style: {
            background: "#fde890", color: "inherit", padding: 0,
            outline: "1px solid #c79016",
            borderRadius: 1,
          },
        }, seg.slice(idx, idx + q.length))
      );
      i = idx + q.length;
    }
  }
  return out;
}

function ReviewProgress({ data, acceptedCount, dismissedCount, openCount, P, F }) {
  const total = data.summary.risky;
  const reviewed = acceptedCount + dismissedCount;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        fontFamily: F.mono, fontSize: 10.5, color: P.muted,
        letterSpacing: 0.05,
      }}>review {reviewed}/{total}</span>
      <div style={{
        width: 80, height: 4, background: P.hair, borderRadius: 2, overflow: "hidden",
        display: "flex",
      }}>
        <div style={{ width: `${(acceptedCount / Math.max(total, 1)) * 100}%`, background: P.low }} />
        <div style={{ width: `${(dismissedCount / Math.max(total, 1)) * 100}%`, background: P.muted }} />
      </div>
      <span style={{
        fontFamily: F.mono, fontSize: 10.5, color: openCount > 0 ? P.high : P.low,
        fontWeight: 600,
      }}>{openCount} open</span>
    </div>
  );
}

function ClauseListRow({ clause, isSelected, isHovered, decision, noteCount, error, onClick, onHover, P, F }) {
  const a = clause.analysis;
  const lc = a ? window.CRE.levelColor(a.risk_level, P) : null;
  const num = clause.section_title?.match(/^(\d+)/)?.[1] || "·";
  return (
    <div onClick={onClick}
      onMouseEnter={() => onHover(clause.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        padding: "8px 10px",
        borderRadius: 3,
        cursor: "pointer",
        background: isSelected ? P.hair + "80" : isHovered ? P.hair + "40" : "transparent",
        marginBottom: 1, display: "flex", gap: 10, alignItems: "flex-start",
        opacity: decision === "dismissed" ? 0.5 : 1,
      }}>
      <div style={{
        flexShrink: 0, width: 22, textAlign: "right",
        fontFamily: F.mono, fontSize: 10.5, color: P.muted,
        marginTop: 2, fontVariantNumeric: "tabular-nums",
      }}>{num}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 500, color: P.ink,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: a || error ? 3 : 0,
          textDecoration: decision === "dismissed" ? "line-through" : "none",
        }}>{clause.section_title?.replace(/^\d+\.\s*/, "") || "Untitled clause"}</div>
        {a && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontFamily: F.mono, fontSize: 9.5,
              color: lc.fg, fontWeight: 600,
            }}>{window.CRE.levelGlyph(a.risk_level)}</span>
            <span style={{
              fontSize: 11, color: a.is_risky ? lc.fg : P.muted,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              fontWeight: a.is_risky ? 500 : 400, flex: 1, minWidth: 0,
            }}>{a.risk_category_label}</span>
            {decision && <DecisionDot decision={decision} P={P} />}
            {noteCount > 0 && (
              <span style={{
                fontFamily: F.mono, fontSize: 9, color: P.ink2,
                padding: "1px 4px", background: P.hair, borderRadius: 2,
              }}>{noteCount}</span>
            )}
          </div>
        )}
        {error && (
          <div style={{ fontFamily: F.mono, fontSize: 10, color: P.muted }}>⚠ analysis failed</div>
        )}
      </div>
    </div>
  );
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

function DecisionDot({ decision, P }) {
  const color = decision === "accepted" ? P.low : P.muted;
  return (
    <span style={{
      width: 6, height: 6, borderRadius: 3, background: color, flexShrink: 0,
    }} />
  );
}

function AnalysisPanel({ clause, decision, notes, onDecide, onAddNote, playbook, P, F, D, showAttribution }) {
  const a = clause.analysis;
  const [noteDraft, setNoteDraft] = React.useState("");
  const [showRedline, setShowRedline] = React.useState(true);

  if (!a) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontFamily: F.ui, fontSize: 11, color: P.muted, letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600 }}>
          {clause.section_title}
        </div>
        <div style={{
          marginTop: 16, padding: 16,
          background: P.bg, border: `1px dashed ${P.hair}`, borderRadius: 4,
          fontFamily: F.mono, fontSize: 11.5, color: P.ink2, lineHeight: 1.6,
        }}>
          ⚠ Analysis unavailable for this clause.
          <div style={{ marginTop: 8, color: P.muted }}>
            The model timed out or errored. Re-run analysis or review manually.
          </div>
          <button style={{ ...btnGhost(P), marginTop: 12 }}>Re-run analysis</button>
        </div>
      </div>
    );
  }

  const lc = window.CRE.levelColor(a.risk_level, P);

  const submitNote = () => {
    if (!noteDraft.trim()) return;
    onAddNote(noteDraft.trim());
    setNoteDraft("");
  };

  return (
    <div style={{ padding: 24, fontFamily: F.ui }}>
      {/* Meta line */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: P.muted, letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600 }}>{clause.id}</span>
        <span style={{ color: P.hair }}>·</span>
        <span style={{ fontFamily: F.mono, fontSize: 10, color: P.muted }}>chars {clause.char_start}–{clause.char_end}</span>
        <div style={{ flex: 1 }} />
        {decision && <DecisionBadge decision={decision} P={P} F={F} />}
      </div>
      <div style={{ fontSize: 11, color: P.muted, fontWeight: 600, letterSpacing: 0.08, textTransform: "uppercase" }}>
        {clause.section_title}
      </div>

      <div style={{ marginTop: 14, marginBottom: 18, display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{
          padding: "3px 8px", borderRadius: 3, background: lc.bg, color: lc.fg,
          fontFamily: F.mono, fontSize: 10.5, fontWeight: 600, letterSpacing: 0.08, textTransform: "uppercase",
        }}>{a.risk_level} risk</div>
        <div style={{ fontSize: 12.5, color: P.ink, fontWeight: 500 }}>{a.risk_category_label}</div>
      </div>

      <div style={{
        fontFamily: F.body, fontSize: 17, lineHeight: 1.35, color: P.ink,
        letterSpacing: -0.2, marginBottom: 14, textWrap: "pretty",
      }}>{a.short_rationale}</div>
      <div style={{
        fontFamily: F.body, fontSize: 14.5, lineHeight: 1.6, color: P.ink2, marginBottom: 20,
      }}>{a.rationale_text}</div>

      {/* Decision row */}
      <div style={{
        display: "flex", gap: 6, marginBottom: 22,
        padding: "8px 10px", background: P.bg, borderRadius: 3,
      }}>
        <button onClick={() => onDecide("accepted")}
          style={{
            ...btnGhost(P), flex: 1,
            ...(decision === "accepted" ? { background: P.low, color: "#fff", borderColor: P.low } : {}),
          }}>✓ Accept</button>
        <button onClick={() => onDecide("dismissed")}
          style={{
            ...btnGhost(P), flex: 1,
            ...(decision === "dismissed" ? { background: P.ink2, color: P.bg, borderColor: P.ink2 } : {}),
          }}>✕ Dismiss</button>
      </div>

      {/* Playbook */}
      {playbook && (
        <Section label="Playbook · standard position" P={P} F={F}>
          <div style={{
            padding: "10px 12px", background: P.bg, borderLeft: `2px solid ${lc.fg}`,
            fontFamily: F.body, fontSize: 13.5, lineHeight: 1.55, color: P.ink2,
          }}>
            <div style={{
              fontFamily: F.mono, fontSize: 10, color: lc.fg, fontWeight: 600,
              letterSpacing: 0.08, textTransform: "uppercase", marginBottom: 6,
            }}>{playbook.severity}</div>
            {playbook.standard}
          </div>
          <div style={{
            marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between",
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
              marginTop: 6, padding: "10px 12px", background: P.surface,
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
        </Section>
      )}

      {/* Confidence */}
      <Section label="Confidence" P={P} F={F}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Metric label="LLM" value={window.CRE.pct(a.llm_confidence)} P={P} F={F} />
          <Metric label="Calibrated" value={window.CRE.pct(a.confidence)} P={P} F={F} />
        </div>
        <ConfidenceBar value={a.confidence} P={P} />
      </Section>

      {/* Attribution */}
      {a.top_tokens?.length > 0 && (
        <Section label="Why — top tokens" P={P} F={F}>
          {a.attribution?.output && (
            <div style={{
              fontFamily: F.mono, fontSize: 11.5, color: lc.fg,
              padding: "6px 10px", background: lc.bg, borderRadius: 3,
              marginBottom: 10, fontWeight: 500,
            }}>→ {a.attribution.output}</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {a.top_tokens.map((t, i) => (
              <TokenBar key={i} token={t} max={a.top_tokens[0].score} color={lc} P={P} F={F} />
            ))}
          </div>
        </Section>
      )}

      {/* Notes thread */}
      <Section label={`Notes ${notes.length ? `· ${notes.length}` : ""}`} P={P} F={F}>
        {notes.map((n) => (
          <div key={n.id} style={{
            padding: "8px 10px", marginBottom: 6,
            background: P.bg, borderRadius: 3,
            borderLeft: `2px solid ${P.hair}`,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontFamily: F.mono, fontSize: 9.5, color: P.muted,
              marginBottom: 3,
            }}>
              <span style={{ color: P.ink2, fontWeight: 600 }}>{n.who}</span>
              <span>{relativeTime(n.ts)}</span>
            </div>
            <div style={{ fontFamily: F.body, fontSize: 13.5, lineHeight: 1.5, color: P.ink }}>{n.body}</div>
          </div>
        ))}
        <div style={{ marginTop: 6 }}>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Add a note for the team…"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitNote();
            }}
            style={{
              width: "100%", minHeight: 60, resize: "vertical",
              padding: "8px 10px", border: `1px solid ${P.hair}`, borderRadius: 3,
              background: P.surface, color: P.ink,
              fontFamily: F.body, fontSize: 13.5, lineHeight: 1.5, outline: "none",
            }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: P.muted }}>⌘↵ to send</span>
            <button onClick={submitNote} disabled={!noteDraft.trim()}
              style={{
                ...btnSolid(P),
                opacity: noteDraft.trim() ? 1 : 0.4,
                cursor: noteDraft.trim() ? "pointer" : "default",
              }}>Add note</button>
          </div>
        </div>
      </Section>
    </div>
  );
}

// Renders **bold** and ~~strike~~ inline within the redline string.
function Redline({ text, P }) {
  const parts = [];
  let key = 0;
  // First split on **bold**
  const boldRe = /\*\*([^*]+)\*\*/g;
  const strikeRe = /~~([^~]+)~~/g;
  // Walk a simple state machine: tokens are bold|strike|plain
  const matches = [];
  let m;
  while ((m = boldRe.exec(text)) !== null) matches.push({ s: m.index, e: m.index + m[0].length, body: m[1], kind: "bold" });
  while ((m = strikeRe.exec(text)) !== null) matches.push({ s: m.index, e: m.index + m[0].length, body: m[1], kind: "strike" });
  matches.sort((a, b) => a.s - b.s);
  let i = 0;
  for (const mt of matches) {
    if (mt.s > i) parts.push(<span key={key++}>{text.slice(i, mt.s)}</span>);
    if (mt.kind === "bold") {
      parts.push(<span key={key++} style={{ background: "#dde3d2", color: "#3a4a32", fontWeight: 600, padding: "0 2px" }}>{mt.body}</span>);
    } else {
      parts.push(<span key={key++} style={{ textDecoration: "line-through", color: P.muted, opacity: 0.7 }}>{mt.body}</span>);
    }
    i = mt.e;
  }
  if (i < text.length) parts.push(<span key={key++}>{text.slice(i)}</span>);
  return <>{parts}</>;
}

function ActivityPanel({ activity, clauses, onSelect, onReset, onClose, P, F }) {
  const clauseMap = Object.fromEntries(clauses.map((c) => [c.id, c]));
  return (
    <div style={{
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
          <div style={{
            padding: "32px 16px", textAlign: "center",
            fontFamily: F.mono, fontSize: 11, color: P.muted,
          }}>
            No activity yet.
            <div style={{ marginTop: 4, fontSize: 10 }}>Accept, dismiss, or note clauses to build a review log.</div>
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
                borderLeft: `2px solid ${verb.color}`,
                marginBottom: 1,
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

// — Style helpers —

function chipStyle(P, F, active) {
  return {
    padding: "4px 8px",
    fontSize: 11.5,
    fontFamily: F.ui,
    border: `1px solid ${active ? P.ink : P.hair}`,
    background: active ? P.ink : "transparent",
    color: active ? P.bg : P.ink2,
    borderRadius: 3, cursor: "pointer",
    fontWeight: 500,
  };
}

function Section({ label, P, F, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontFamily: F.ui, fontSize: 10.5, letterSpacing: 0.08, textTransform: "uppercase",
        color: P.muted, fontWeight: 600, marginBottom: 10,
      }}>{label}</div>
      {children}
    </div>
  );
}

function Metric({ label, value, P, F }) {
  return (
    <div>
      <div style={{ fontFamily: F.mono, fontSize: 10.5, color: P.muted, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: F.mono, fontSize: 22, color: P.ink, fontWeight: 500, fontVariantNumeric: "tabular-nums", letterSpacing: -0.5 }}>{value}</div>
    </div>
  );
}

function ConfidenceBar({ value, P }) {
  if (value == null) return null;
  return (
    <div style={{ marginTop: 10, height: 4, background: P.hair, borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${value * 100}%`, background: P.ink }} />
    </div>
  );
}

function TokenBar({ token, max, color, P, F }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
      <div style={{ position: "relative", height: 22, background: P.hair + "60", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, width: `${(token.score / max) * 100}%`, background: color.hl }} />
        <div style={{
          position: "relative", padding: "3px 8px",
          fontFamily: F.mono, fontSize: 11, color: P.ink,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{token.token}</div>
      </div>
      <div style={{
        fontFamily: F.mono, fontSize: 10.5, color: P.muted,
        fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right",
      }}>{token.score.toFixed(2)}</div>
    </div>
  );
}

function btnGhost(P) {
  return {
    padding: "5px 10px",
    fontSize: 11.5,
    fontFamily: window.CRE.fonts.ui,
    background: "transparent",
    color: P.ink2,
    border: `1px solid ${P.hair}`,
    borderRadius: 3, cursor: "pointer", fontWeight: 500,
  };
}
function btnSolid(P) {
  return {
    padding: "5px 12px",
    fontSize: 11.5,
    fontFamily: window.CRE.fonts.ui,
    background: P.ink, color: P.bg,
    border: `1px solid ${P.ink}`,
    borderRadius: 3, cursor: "pointer", fontWeight: 500,
  };
}

window.DocumentReader = DocumentReader;
