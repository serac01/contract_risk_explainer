"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePayload } from "@/components/usePayload";
import { COLORS, levelColor, pct } from "@/lib/design";
import type { RiskLevel } from "@/lib/types";

type HunkStatus = "proposed" | "accepted" | "rejected";

export default function RedlinePage() {
  const { payload, loaded } = usePayload();
  const [hunks, setHunks] = useState<Record<string, HunkStatus>>({});

  const risky = useMemo(
    () =>
      (payload?.clauses ?? [])
        .filter((c) => c.analysis?.is_risky)
        .sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 } as const;
          return (
            order[a.analysis!.risk_level] - order[b.analysis!.risk_level]
          );
        }),
    [payload],
  );

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

  if (risky.length === 0) {
    return (
      <div className="p-12 max-w-2xl">
        <div className="label-mono mb-2">REDLINE</div>
        <h1 className="serif text-[28px] mb-3">No risky clauses to redline.</h1>
        <p className="text-muted text-[13px]">
          The contract is broadly market — nothing requires negotiation.
        </p>
      </div>
    );
  }

  const counts = {
    proposed: Object.values(hunks).filter((h) => h === "proposed").length,
    accepted: Object.values(hunks).filter((h) => h === "accepted").length,
    rejected: Object.values(hunks).filter((h) => h === "rejected").length,
  };

  return (
    <div className="flex-1 grid grid-cols-[260px_1fr_280px] overflow-hidden h-[calc(100vh-52px)]">
      {/* Hunk list */}
      <aside className="border-r border-hair overflow-y-auto bg-bg2">
        <div className="px-4 py-4 border-b border-hair">
          <div className="label-mono mb-1">REDLINES</div>
          <div className="text-[14px]">{risky.length} hunks</div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-[10.5px] mono">
            <Counter label="Proposed" value={counts.proposed} color={COLORS.medium} />
            <Counter label="Accepted" value={counts.accepted} color={COLORS.low} />
            <Counter label="Rejected" value={counts.rejected} color={COLORS.muted} />
          </div>
        </div>
        {risky.map((c, i) => {
          const lc = levelColor(c.analysis!.risk_level as RiskLevel);
          const status = hunks[c.id];
          return (
            <div
              key={c.id}
              className="px-3 py-2 border-b border-hair flex items-start gap-2"
              style={{ borderLeft: `3px solid ${lc.bg}` }}
            >
              <span className="mono text-[10.5px] text-muted w-5 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] truncate">{c.section_title}</div>
                <div
                  className="mono text-[10.5px] uppercase mt-0.5"
                  style={{ color: lc.fg }}
                >
                  {c.analysis!.risk_category_label}
                </div>
              </div>
              {status && (
                <span
                  className="mono text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background:
                      status === "accepted"
                        ? COLORS.low
                        : status === "rejected"
                          ? COLORS.muted
                          : COLORS.medium,
                    color: "#fff",
                  }}
                >
                  {status}
                </span>
              )}
            </div>
          );
        })}
      </aside>

      {/* Diff column */}
      <section className="overflow-y-auto px-10 py-8 bg-bg">
        {risky.map((c) => {
          const lc = levelColor(c.analysis!.risk_level as RiskLevel);
          const status = hunks[c.id];
          return (
            <div key={c.id} className="mb-10">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="mono text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: lc.wash, color: lc.fg }}
                >
                  {c.analysis!.risk_level}
                </span>
                <span className="text-[12.5px] text-muted">
                  {c.section_title}
                </span>
                <span className="ml-auto mono text-[10.5px] text-muted">
                  conf {pct(c.analysis!.confidence)}
                </span>
              </div>
              <h2 className="serif text-[18px] mb-3 leading-snug">
                {c.analysis!.short_rationale}
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface border border-hair rounded">
                  <div className="px-3 py-1.5 border-b border-hair flex items-center gap-2">
                    <span
                      className="mono text-[10px] px-1 rounded"
                      style={{ background: COLORS.highWash, color: COLORS.high }}
                    >
                      −
                    </span>
                    <span className="label-mono">AS DRAFTED</span>
                  </div>
                  <div className="px-3 py-3 serif text-[12.5px] leading-relaxed text-ink2 whitespace-pre-wrap">
                    {c.text}
                  </div>
                </div>
                <div className="bg-surface border border-hair rounded">
                  <div className="px-3 py-1.5 border-b border-hair flex items-center gap-2">
                    <span
                      className="mono text-[10px] px-1 rounded"
                      style={{ background: COLORS.lowWash, color: COLORS.low }}
                    >
                      +
                    </span>
                    <span className="label-mono">PROPOSED REDLINE</span>
                  </div>
                  <div className="px-3 py-3 serif text-[12.5px] leading-relaxed text-ink2">
                    <em className="not-italic" style={{ background: COLORS.lowWash, padding: "0 2px" }}>
                      [Counterparty edit suggested — derived from rationale]
                    </em>
                    <p className="mt-2 text-[12px] text-muted">
                      {c.analysis!.rationale_text}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  className={`chip ${status === "proposed" ? "chip-active" : ""}`}
                  onClick={() =>
                    setHunks((h) => ({ ...h, [c.id]: status === "proposed" ? ("rejected" as HunkStatus) : ("proposed" as HunkStatus) }))
                  }
                >
                  Propose
                </button>
                <button
                  className="chip"
                  style={
                    status === "accepted"
                      ? { background: COLORS.low, borderColor: COLORS.low, color: "#fff" }
                      : undefined
                  }
                  onClick={() =>
                    setHunks((h) => ({ ...h, [c.id]: "accepted" }))
                  }
                >
                  Accept
                </button>
                <button
                  className="chip"
                  style={
                    status === "rejected"
                      ? { background: COLORS.muted, borderColor: COLORS.muted, color: "#fff" }
                      : undefined
                  }
                  onClick={() =>
                    setHunks((h) => ({ ...h, [c.id]: "rejected" }))
                  }
                >
                  Drop
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* Right: package */}
      <aside className="border-l border-hair p-5 bg-surface overflow-y-auto">
        <div className="label-mono mb-2">REDLINE PACKAGE</div>
        <div className="text-[12.5px] text-muted mb-4">
          {counts.accepted} of {risky.length} hunks ready
        </div>
        <input
          type="email"
          placeholder="counterparty@…"
          className="w-full text-[12px] border border-hair rounded px-2 py-1.5 mb-3 bg-bg2"
        />
        <button className="btn-solid w-full mb-2">Generate package</button>
        <button className="btn-ghost w-full">Preview memo</button>
        <p className="text-[11px] text-muted mt-4 leading-relaxed">
          Stub UI — wire to a backend redline package endpoint to send.
        </p>
      </aside>
    </div>
  );
}

function Counter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="px-1.5 py-1 rounded border border-hair bg-bg2">
      <div className="label-mono leading-none mb-1">{label}</div>
      <div className="serif text-[16px] leading-none" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
