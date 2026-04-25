"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePayload } from "@/components/usePayload";
import { useReviewState } from "@/lib/review";
import { COLORS, levelColor, levelGlyph, pct } from "@/lib/design";
import { Heatmap } from "@/components/Heatmap";
import type { Clause, RiskLevel } from "@/lib/types";

export default function DocumentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted">Loading…</div>}>
      <DocumentInner />
    </Suspense>
  );
}

function DocumentInner() {
  const { payload, fileName, loaded } = usePayload();
  const { state: review, setDecision, addNote } = useReviewState();
  const search = useSearchParams();
  const initialId = search.get("clause");

  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [statusFilter, setStatusFilter] = useState<"all" | "risky" | "open" | "accepted">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [noteDraft, setNoteDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const clauseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const clauses = payload?.clauses ?? [];

  const categories = useMemo(() => {
    const s = new Set<string>();
    clauses.forEach((c) => {
      if (c.analysis?.is_risky) s.add(c.analysis.risk_category_label);
    });
    return Array.from(s).sort();
  }, [clauses]);

  const visibleClauses = useMemo(() => {
    return clauses.filter((c) => {
      const a = c.analysis;
      const dec = review.decisions[c.id];
      if (statusFilter === "risky" && !a?.is_risky) return false;
      if (statusFilter === "open" && (!a?.is_risky || dec)) return false;
      if (statusFilter === "accepted" && dec !== "accepted") return false;
      if (
        categoryFilter !== "all" &&
        a?.risk_category_label !== categoryFilter
      )
        return false;
      return true;
    });
  }, [clauses, statusFilter, categoryFilter, review.decisions]);

  // First select default
  useEffect(() => {
    if (!selectedId && visibleClauses.length > 0) {
      const firstRisky = visibleClauses.find((c) => c.analysis?.is_risky);
      setSelectedId((firstRisky ?? visibleClauses[0]).id);
    }
  }, [visibleClauses, selectedId]);

  // Smooth scroll to selected clause in body
  useEffect(() => {
    if (!selectedId) return;
    const el = clauseRefs.current[selectedId];
    if (el && bodyRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedId]);

  if (!loaded) return <div className="p-8 text-muted">Loading…</div>;
  if (!payload) {
    return (
      <div className="p-12 max-w-2xl">
        <p className="text-muted mb-4">No contract has been analysed yet.</p>
        <Link href="/workspace" className="btn-solid">
          Go to workspace
        </Link>
      </div>
    );
  }

  const selected = clauses.find((c) => c.id === selectedId);
  const decision = selected ? review.decisions[selected.id] ?? null : null;

  return (
    <div className="flex-1 grid grid-cols-[260px_1fr_360px] overflow-hidden h-[calc(100vh-52px)]">
      {/* Left pane: clause list */}
      <aside className="border-r border-hair overflow-y-auto scroll-thin bg-bg2">
        <div className="sticky top-0 bg-bg2 px-3 py-3 border-b border-hair z-10">
          <div className="label-mono mb-2">CLAUSES</div>
          <div className="flex gap-1 flex-wrap mb-2">
            {(["all", "risky", "open", "accepted"] as const).map((s) => (
              <button
                key={s}
                className={`chip text-[10.5px] px-2 py-0.5 ${statusFilter === s ? "chip-active" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
          {categories.length > 0 && (
            <select
              className="w-full text-[11.5px] bg-surface border border-hair rounded px-2 py-1"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="py-1">
          {visibleClauses.map((c, i) => {
            const a = c.analysis;
            const lc = levelColor(a?.risk_level as RiskLevel);
            const dec = review.decisions[c.id];
            const isSel = selectedId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-2 border-l-[3px] flex items-start gap-2 ${
                  isSel ? "bg-hair" : "hover:bg-bg"
                }`}
                style={{
                  borderLeftColor: a?.is_risky ? lc.bg : "transparent",
                }}
              >
                <span className="mono text-[10.5px] text-muted w-6 shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] truncate">
                    {c.section_title || "(unnamed clause)"}
                  </span>
                  {a?.is_risky && (
                    <span
                      className="mono text-[10px] uppercase mt-0.5 inline-block"
                      style={{ color: lc.fg }}
                    >
                      {levelGlyph(a.risk_level as RiskLevel)} {a.risk_category_label}
                    </span>
                  )}
                </span>
                {dec && (
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5"
                    style={{
                      background: dec === "accepted" ? COLORS.low : COLORS.muted,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Center pane: document body */}
      <section
        ref={bodyRef}
        className="overflow-y-auto scroll-thin px-12 py-10 bg-bg"
      >
        <div className="max-w-[680px] mx-auto">
          <div className="label-mono mb-2">CONTRACT</div>
          <h1 className="serif text-[28px] mb-8">{fileName}</h1>

          {clauses.map((c, i) => {
            const a = c.analysis;
            const lc = levelColor(a?.risk_level as RiskLevel);
            const isSel = selectedId === c.id;
            const isVisible = visibleClauses.some((v) => v.id === c.id);
            return (
              <div
                key={c.id}
                ref={(el) => {
                  clauseRefs.current[c.id] = el;
                }}
                onClick={() => setSelectedId(c.id)}
                className={`mb-6 pl-4 cursor-pointer transition-colors ${
                  isVisible ? "opacity-100" : "opacity-40"
                }`}
                style={{
                  borderLeft: a?.is_risky
                    ? `3px solid ${lc.bg}`
                    : isSel
                      ? `3px solid ${COLORS.ink}`
                      : "3px solid transparent",
                  background: isSel ? COLORS.bg2 : undefined,
                }}
              >
                {c.section_title && (
                  <div className="mono text-[10.5px] uppercase tracking-wider text-muted mb-1">
                    {String(i + 1).padStart(2, "0")} · {c.section_title}
                  </div>
                )}
                <p
                  className="serif text-[15px] leading-[1.7] text-ink whitespace-pre-wrap"
                  style={{ fontFamily: "Source Serif 4, Georgia, serif" }}
                >
                  {a?.attribution?.tokens && a.is_risky ? (
                    <Heatmap
                      text={c.text}
                      tokens={a.attribution.tokens}
                      hl={lc.hl}
                    />
                  ) : (
                    c.text
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Right pane: analysis panel */}
      <aside className="border-l border-hair overflow-y-auto scroll-thin bg-surface">
        {selected && selected.analysis ? (
          <AnalysisPanel
            clause={selected}
            decision={decision}
            notes={review.notes[selected.id] ?? []}
            onAccept={() =>
              setDecision(
                selected.id,
                decision === "accepted" ? null : "accepted",
              )
            }
            onDismiss={() =>
              setDecision(
                selected.id,
                decision === "dismissed" ? null : "dismissed",
              )
            }
            noteDraft={noteDraft}
            setNoteDraft={setNoteDraft}
            onAddNote={() => {
              addNote(selected.id, noteDraft);
              setNoteDraft("");
            }}
          />
        ) : selected ? (
          <div className="p-6 text-muted text-[12.5px]">
            <div className="label-mono mb-2">NO ANALYSIS</div>
            This clause was not analysed.
          </div>
        ) : (
          <div className="p-6 text-muted text-[12.5px]">
            Select a clause to view its analysis.
          </div>
        )}
      </aside>
    </div>
  );
}

function AnalysisPanel({
  clause,
  decision,
  notes,
  onAccept,
  onDismiss,
  noteDraft,
  setNoteDraft,
  onAddNote,
}: {
  clause: Clause;
  decision: "accepted" | "dismissed" | null;
  notes: { ts: number; body: string }[];
  onAccept: () => void;
  onDismiss: () => void;
  noteDraft: string;
  setNoteDraft: (s: string) => void;
  onAddNote: () => void;
}) {
  const a = clause.analysis!;
  const lc = levelColor(a.risk_level as RiskLevel);

  return (
    <div className="p-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span
            className="mono text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: lc.wash, color: lc.fg }}
          >
            {levelGlyph(a.risk_level as RiskLevel)} {a.risk_level}
          </span>
          <span className="text-[11.5px] text-muted">{a.risk_category_label}</span>
        </div>
        <h2 className="serif text-[18px] leading-snug mb-2">
          {a.short_rationale}
        </h2>
        <p className="text-[13px] text-ink2 leading-relaxed">
          {a.rationale_text}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          className="chip flex-1"
          onClick={onAccept}
          style={
            decision === "accepted"
              ? { background: COLORS.low, borderColor: COLORS.low, color: "#fff" }
              : undefined
          }
        >
          ✓ Accept
        </button>
        <button
          className="chip flex-1"
          onClick={onDismiss}
          style={
            decision === "dismissed"
              ? { background: COLORS.muted, borderColor: COLORS.muted, color: "#fff" }
              : undefined
          }
        >
          ✕ Dismiss
        </button>
      </div>

      <div>
        <div className="label-mono mb-2">CONFIDENCE</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10.5px] text-muted">LLM</div>
            <div className="serif text-[22px]">{pct(a.llm_confidence)}</div>
          </div>
          <div>
            <div className="text-[10.5px] text-muted">Calibrated</div>
            <div className="serif text-[22px]">{pct(a.confidence)}</div>
          </div>
        </div>
      </div>

      {a.top_tokens && a.top_tokens.length > 0 && (
        <div>
          <div className="label-mono mb-2">TOP TOKENS</div>
          {a.attribution?.output && (
            <div
              className="text-[11.5px] mb-2 px-2 py-1 rounded"
              style={{ background: lc.wash, color: lc.fg }}
            >
              → {a.attribution.output}
            </div>
          )}
          <div className="space-y-1.5">
            {a.top_tokens.slice(0, 5).map((t, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_36px] gap-2 items-center"
              >
                <div
                  className="mono text-[10.5px] uppercase px-1.5 py-1 rounded truncate"
                  style={{ background: lc.wash }}
                  title={t.token}
                >
                  {t.token}
                </div>
                <div className="mono text-[10.5px] text-muted text-right">
                  {t.score.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="label-mono mb-2">METADATA</div>
        <div className="mono text-[10.5px] text-muted leading-relaxed">
          <div>id {clause.id}</div>
          <div>
            chars {clause.char_start}–{clause.char_end}
          </div>
          <div>words {clause.word_count}</div>
        </div>
      </div>

      <div>
        <div className="label-mono mb-2">NOTES</div>
        <div className="space-y-2 mb-2">
          {notes.length === 0 && (
            <div className="text-[11.5px] text-muted italic">No notes yet.</div>
          )}
          {notes.map((n, i) => (
            <div key={i} className="text-[12px] bg-bg rounded p-2 border border-hair">
              <div className="text-muted text-[10.5px] mb-0.5">
                {new Date(n.ts).toLocaleString()}
              </div>
              {n.body}
            </div>
          ))}
        </div>
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              onAddNote();
            }
          }}
          className="w-full text-[12.5px] border border-hair rounded p-2 bg-bg2 resize-none"
          rows={2}
          placeholder="Add note (Cmd/Ctrl+Enter)"
        />
        <div className="text-right mt-1">
          <button className="btn-ghost text-[11px]" onClick={onAddNote}>
            Add note
          </button>
        </div>
      </div>
    </div>
  );
}
