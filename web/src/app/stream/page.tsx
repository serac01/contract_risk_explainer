"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePayload } from "@/components/usePayload";
import { COLORS, levelColor, levelGlyph, pct } from "@/lib/design";
import type { RiskLevel } from "@/lib/types";

type Filter = "all" | "risky" | "high" | "medium" | "low";

export default function StreamPage() {
  const { payload, loaded } = usePayload();
  const [filter, setFilter] = useState<Filter>("risky");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const clauses = payload?.clauses ?? [];
  const summary = payload?.summary;

  const visible = useMemo(() => {
    return clauses.filter((c) => {
      const a = c.analysis;
      if (!a) return filter === "all";
      switch (filter) {
        case "all":
          return true;
        case "risky":
          return a.is_risky;
        case "high":
          return a.risk_level === "high";
        case "medium":
          return a.risk_level === "medium";
        case "low":
          return a.risk_level === "low";
      }
    });
  }, [clauses, filter]);

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

  return (
    <div className="flex-1 overflow-auto px-8 py-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-4">
          <div className="label-mono mb-2">CLAUSE STREAM</div>
          <h1 className="serif text-[24px] mb-2">
            {summary?.analysed}/{summary?.clause_count} clauses analysed ·{" "}
            {summary?.risky} risky
          </h1>
        </div>

        <div className="flex items-center gap-1 sticky top-0 bg-bg py-3 border-b border-hair z-10 mb-2">
          {(
            [
              ["all", `All ${summary?.clause_count}`],
              ["risky", `Risky ${summary?.risky}`],
              ["high", `High ${summary?.high}`],
              ["medium", `Med ${summary?.medium}`],
              ["low", `Low ${summary?.low}`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              className={`chip ${filter === k ? "chip-active" : ""}`}
              onClick={() => setFilter(k)}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto mono text-[10.5px] text-muted">
            click row to expand
          </span>
        </div>

        <div className="bg-surface border border-hair rounded">
          {visible.map((c, i) => {
            const a = c.analysis;
            const lc = levelColor(a?.risk_level as RiskLevel);
            const isOpen = expanded.has(c.id);
            return (
              <div
                key={c.id}
                className="border-b border-hair last:border-b-0"
                style={{
                  borderLeft: a?.is_risky ? `2px solid ${lc.bg}` : undefined,
                }}
              >
                <button
                  className="w-full grid grid-cols-[40px_24px_180px_1fr_140px_60px] gap-3 items-center text-left px-3 py-2.5 hover:bg-bg2"
                  onClick={() =>
                    setExpanded((cur) => {
                      const next = new Set(cur);
                      if (next.has(c.id)) next.delete(c.id);
                      else next.add(c.id);
                      return next;
                    })
                  }
                >
                  <span className="mono text-[10.5px] text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="mono text-[12px]"
                    style={{ color: a?.is_risky ? lc.fg : COLORS.muted }}
                  >
                    {levelGlyph(a?.risk_level as RiskLevel)}
                  </span>
                  <span className="mono text-[11px] truncate text-muted">
                    {c.section_title}
                  </span>
                  <span className="text-[12.5px] truncate">
                    {a?.short_rationale ?? "—"}
                  </span>
                  <span
                    className="mono text-[10.5px] uppercase truncate"
                    style={{ color: a?.is_risky ? lc.fg : COLORS.muted }}
                  >
                    {a?.risk_category_label ?? "—"}
                  </span>
                  <span className="mono text-[10.5px] text-muted text-right">
                    {a ? pct(a.confidence) : "—"}
                  </span>
                </button>

                {isOpen && (
                  <div className="grid grid-cols-[1fr_240px] gap-6 px-4 pb-4 pt-1 bg-bg2">
                    <p className="serif text-[13px] leading-relaxed text-ink2 whitespace-pre-wrap">
                      {c.text}
                    </p>
                    <div>
                      <div className="label-mono mb-2">TOP TOKENS</div>
                      {a?.top_tokens && a.top_tokens.length > 0 ? (
                        <div className="space-y-1">
                          {a.top_tokens.slice(0, 5).map((t, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-[1fr_32px] gap-2 items-center"
                            >
                              <span
                                className="mono text-[10.5px] px-1.5 py-1 rounded truncate"
                                style={{ background: lc.wash }}
                                title={t.token}
                              >
                                {t.token}
                              </span>
                              <span className="mono text-[10.5px] text-muted text-right">
                                {t.score.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted italic">
                          No attribution.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {visible.length === 0 && (
            <div className="px-6 py-12 text-center text-muted text-[13px]">
              No clauses match this filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
