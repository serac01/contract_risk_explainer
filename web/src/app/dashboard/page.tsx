"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePayload } from "@/components/usePayload";
import { useReviewState } from "@/lib/review";
import { COLORS, levelColor, levelGlyph, pct } from "@/lib/design";
import { Heatmap } from "@/components/Heatmap";
import type { Clause, RiskLevel } from "@/lib/types";

type StatusFilter = "risky" | "open" | "high" | "medium" | "low" | "accepted" | "dismissed" | "all";

export default function DashboardPage() {
  const { payload, fileName, loaded } = usePayload();
  const { state: review, setDecision } = useReviewState();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("risky");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const clauses = payload?.clauses ?? [];
  const summary = payload?.summary;

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const c of clauses) {
      if (c.analysis?.is_risky) s.add(c.analysis.risk_category_label);
    }
    return Array.from(s).sort();
  }, [clauses]);

  const findings = useMemo(() => {
    const all = clauses.filter((c) => c.analysis);
    return all.filter((c) => {
      const a = c.analysis!;
      const dec = review.decisions[c.id];
      switch (statusFilter) {
        case "risky":
          if (!a.is_risky) return false;
          break;
        case "open":
          if (!a.is_risky || dec) return false;
          break;
        case "high":
          if (a.risk_level !== "high") return false;
          break;
        case "medium":
          if (a.risk_level !== "medium") return false;
          break;
        case "low":
          if (a.risk_level !== "low") return false;
          break;
        case "accepted":
          if (dec !== "accepted") return false;
          break;
        case "dismissed":
          if (dec !== "dismissed") return false;
          break;
        case "all":
        default:
          break;
      }
      if (categoryFilter !== "all" && a.risk_category_label !== categoryFilter) return false;
      return true;
    });
  }, [clauses, statusFilter, categoryFilter, review.decisions]);

  const accepted = Object.values(review.decisions).filter((d) => d === "accepted").length;
  const dismissed = Object.values(review.decisions).filter((d) => d === "dismissed").length;

  const driverCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of clauses) {
      if (c.analysis?.is_risky && c.analysis.risk_level !== "low") {
        counts.set(
          c.analysis.risk_category_label,
          (counts.get(c.analysis.risk_category_label) ?? 0) + 1,
        );
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => k);
  }, [clauses]);

  if (!loaded) {
    return <div className="p-12 text-muted text-sm">Loading…</div>;
  }
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

  const errors = payload.errors ?? [];

  return (
    <div className="flex-1 overflow-auto">
      {/* Sub-header */}
      <div className="border-b border-hair bg-bg2 px-8 py-3 flex items-center gap-4 sticky top-0 z-10">
        <div className="w-[22px] h-[22px] rounded bg-ink text-bg flex items-center justify-center mono text-[12px]">
          §
        </div>
        <div>
          <div className="text-[13px] font-semibold leading-tight">
            {fileName}
          </div>
          <div className="label-mono mt-0.5">
            ANALYSIS · {summary?.clause_count} clauses · {summary?.risky} risky
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-[11.5px] text-muted">
            review {accepted + dismissed}/{summary?.risky ?? 0}
          </div>
          <div className="w-32 h-1 bg-hair rounded overflow-hidden flex">
            {summary && summary.risky > 0 && (
              <>
                <div
                  style={{ width: `${(accepted / summary.risky) * 100}%`, background: COLORS.low }}
                />
                <div
                  style={{ width: `${(dismissed / summary.risky) * 100}%`, background: COLORS.muted }}
                />
              </>
            )}
          </div>
          <button className="btn-ghost">Export PDF</button>
          <button className="btn-solid">Share findings</button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-[1100px] mx-auto">
        {/* Hero */}
        <div className="mb-6">
          <div className="label-mono mb-2">RISK BRIEFING</div>
          <h1 className="serif text-[40px] leading-[1.1] mb-3 text-ink max-w-3xl">
            {summary && summary.high > 0 ? (
              <>
                {summary.high} high-risk finding{summary.high === 1 ? "" : "s"}
                {driverCategories.length > 0 ? (
                  <>
                    {" "}centred on{" "}
                    <em className="serif italic" style={{ color: COLORS.high }}>
                      {driverCategories[0]}
                    </em>
                    {driverCategories[1] && (
                      <>
                        {" "}and{" "}
                        <em className="serif italic" style={{ color: COLORS.high }}>
                          {driverCategories[1]}
                        </em>
                      </>
                    )}
                  </>
                ) : null}
                ; {summary.medium} medium, {summary.low} low.
              </>
            ) : summary && summary.risky > 0 ? (
              <>
                {summary.medium} medium-risk and {summary.low} low-risk findings.
              </>
            ) : (
              <>No material risks detected.</>
            )}
          </h1>
          <p className="text-muted text-[14px] max-w-2xl">
            {summary && summary.risky > 0
              ? "Review each finding below — clauses are ranked by severity. Accept to confirm the AI judgment, or dismiss to override."
              : "The contract is broadly market. No clauses crossed the risk threshold."}
          </p>
        </div>

        {/* Distribution bar */}
        {summary && (
          <div className="mb-6">
            <div className="flex h-2 rounded overflow-hidden bg-hair">
              {summary.high > 0 && (
                <div style={{ flex: summary.high, background: COLORS.high }} />
              )}
              {summary.medium > 0 && (
                <div style={{ flex: summary.medium, background: COLORS.medium }} />
              )}
              {summary.low > 0 && (
                <div style={{ flex: summary.low, background: COLORS.low }} />
              )}
              {summary.clause_count - summary.risky > 0 && (
                <div
                  style={{
                    flex: summary.clause_count - summary.risky,
                    background: COLORS.hair2,
                  }}
                />
              )}
            </div>
            <div className="flex gap-4 mt-2 text-[11.5px] text-muted">
              <Legend color={COLORS.high} label="High" count={summary.high} />
              <Legend color={COLORS.medium} label="Med" count={summary.medium} />
              <Legend color={COLORS.low} label="Low" count={summary.low} />
              <Legend
                color={COLORS.hair2}
                label="OK"
                count={summary.clause_count - summary.risky}
              />
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Clauses analysed" value={`${summary?.analysed} / ${summary?.clause_count}`} />
          <StatCard
            label="Open"
            value={`${(summary?.risky ?? 0) - accepted - dismissed}`}
            tone={COLORS.high}
          />
          <StatCard label="Accepted" value={`${accepted}`} tone={COLORS.low} />
          <StatCard
            label="Errors"
            value={`${errors.length}`}
            tone={errors.length ? COLORS.high : undefined}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-[13px] font-semibold mr-2">Findings</span>
          <span className="serif italic text-[15px] text-muted mr-3">
            Ranked by severity
          </span>
          {(
            [
              ["risky", `Risky ${summary?.risky ?? 0}`],
              ["open", `Open ${(summary?.risky ?? 0) - accepted - dismissed}`],
              ["high", `High ${summary?.high ?? 0}`],
              ["medium", `Med ${summary?.medium ?? 0}`],
              ["low", `Low ${summary?.low ?? 0}`],
              ["accepted", `Accepted ${accepted}`],
              ["dismissed", `Dismissed ${dismissed}`],
              ["all", `All ${summary?.clause_count ?? 0}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={`chip ${statusFilter === key ? "chip-active" : ""}`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="label-mono mr-1">CATEGORY</span>
            <button
              className={`chip ${categoryFilter === "all" ? "chip-active" : ""}`}
              onClick={() => setCategoryFilter("all")}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`chip ${categoryFilter === cat ? "chip-active" : ""}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Findings list */}
        <div className="bg-surface border border-hair rounded">
          {findings.length === 0 && (
            <div className="px-6 py-12 text-center text-muted text-[13px]">
              No findings match these filters.
            </div>
          )}
          {findings.map((c, i) => (
            <FindingRow
              key={c.id}
              clause={c}
              index={i + 1}
              expanded={expanded === c.id}
              onToggle={() =>
                setExpanded((cur) => (cur === c.id ? null : c.id))
              }
              decision={review.decisions[c.id] ?? null}
              onAccept={() =>
                setDecision(
                  c.id,
                  review.decisions[c.id] === "accepted" ? null : "accepted",
                )
              }
              onDismiss={() =>
                setDecision(
                  c.id,
                  review.decisions[c.id] === "dismissed" ? null : "dismissed",
                )
              }
            />
          ))}
        </div>

        {errors.length > 0 && (
          <div className="mt-6 bg-surface border border-hair rounded p-4">
            <div className="label-mono mb-2" style={{ color: COLORS.high }}>
              ERRORS · {errors.length}
            </div>
            <ul className="text-[12.5px] space-y-1 mono">
              {errors.map((e) => (
                <li key={e.clause_id}>
                  <span className="text-muted">{e.clause_id}</span>{" "}
                  <span>{e.error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-sm inline-block"
        style={{ background: color }}
      />
      <span>
        {label} {count}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="bg-surface border border-hair rounded px-5 py-4">
      <div className="label-mono mb-1">{label}</div>
      <div
        className="serif text-[28px] leading-none"
        style={{ color: tone ?? COLORS.ink }}
      >
        {value}
      </div>
    </div>
  );
}

function FindingRow({
  clause,
  index,
  expanded,
  onToggle,
  decision,
  onAccept,
  onDismiss,
}: {
  clause: Clause;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  decision: "accepted" | "dismissed" | null;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const a = clause.analysis;
  if (!a) return null;
  const lc = levelColor(a.risk_level as RiskLevel);
  const tokens = a.attribution?.tokens ?? a.top_tokens ?? [];

  return (
    <div
      className="border-b border-hair last:border-b-0"
      style={{ borderLeft: `3px solid ${lc.bg}` }}
    >
      <div
        role="button"
        tabIndex={0}
        className="w-full grid grid-cols-[44px_60px_1fr_auto_auto] items-center gap-4 px-5 py-4 text-left hover:bg-bg2 cursor-pointer"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span className="mono text-[11px] text-muted">
          #{String(index).padStart(2, "0")}
        </span>
        <span
          className="mono text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: lc.wash, color: lc.fg }}
        >
          {a.risk_level}
        </span>
        <span className="text-[13px]">
          <span className="text-muted mr-2">
            {clause.section_title}
          </span>
          <span>{a.short_rationale}</span>
        </span>
        <span className="mono text-[11px] text-muted">
          conf {pct(a.confidence)}
        </span>
        <span className="flex gap-1.5 items-center">
          <button
            type="button"
            className={`chip text-[11px] ${decision === "accepted" ? "chip-active" : ""}`}
            style={
              decision === "accepted"
                ? { background: COLORS.low, borderColor: COLORS.low, color: "#fff" }
                : undefined
            }
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
          >
            ✓
          </button>
          <button
            type="button"
            className={`chip text-[11px] ${decision === "dismissed" ? "chip-active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            ✕
          </button>
          <span className="mono text-[11px] text-muted w-3 text-right">
            {expanded ? "−" : "+"}
          </span>
        </span>
      </div>

      {expanded && (
        <div className="px-5 pb-5 grid grid-cols-[1fr_280px] gap-6">
          <div>
            <div
              className="serif italic text-[14px] leading-relaxed pl-4 border-l-2"
              style={{ borderColor: lc.bg, color: COLORS.ink2 }}
            >
              <Heatmap text={clause.text} tokens={tokens} hl={lc.hl} />
            </div>
            <p className="text-[13px] mt-3 leading-relaxed text-ink">
              {a.rationale_text}
            </p>
          </div>
          <div>
            <div className="label-mono mb-2">CONFIDENCE</div>
            <div className="flex items-baseline gap-3 mb-3">
              <div>
                <div className="text-[10.5px] text-muted">LLM</div>
                <div className="serif text-[20px]">{pct(a.llm_confidence)}</div>
              </div>
              <div>
                <div className="text-[10.5px] text-muted">Calibrated</div>
                <div className="serif text-[20px]">{pct(a.confidence)}</div>
              </div>
            </div>

            <div className="label-mono mb-2 mt-4">TOP TOKENS</div>
            {a.attribution?.output && (
              <div
                className="text-[11.5px] mb-2 px-2 py-1 rounded"
                style={{ background: lc.wash, color: lc.fg }}
              >
                → {a.attribution.output}
              </div>
            )}
            <div className="space-y-1.5">
              {(a.top_tokens ?? []).slice(0, 5).map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_36px] gap-2 items-center">
                  <div
                    className="mono text-[10.5px] uppercase px-1.5 py-1 rounded truncate"
                    style={{
                      background: lc.wash,
                      color: COLORS.ink,
                    }}
                    title={t.token}
                  >
                    {t.token}
                  </div>
                  <div className="mono text-[10.5px] text-muted text-right">
                    {t.score.toFixed(2)}
                  </div>
                </div>
              ))}
              {(!a.top_tokens || a.top_tokens.length === 0) && (
                <div className="text-[11px] text-muted italic">
                  No attribution tokens available.
                </div>
              )}
            </div>

            <div className="label-mono mt-5 mb-1">METADATA</div>
            <div className="mono text-[10.5px] text-muted leading-relaxed">
              <div>id {clause.id}</div>
              <div>chars {clause.char_start}–{clause.char_end}</div>
              <div>words {clause.word_count}</div>
              <div>category {a.risk_category}</div>
            </div>

            <div className="mt-4 pt-3 border-t border-hair flex items-center gap-2">
              <span
                className="mono text-[10.5px]"
                style={{ color: lc.fg }}
              >
                {levelGlyph(a.risk_level as RiskLevel)} {a.risk_level.toUpperCase()}
              </span>
              <Link
                href={`/document?clause=${clause.id}`}
                className="btn-ghost text-[11px] ml-auto"
              >
                Open in document →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
