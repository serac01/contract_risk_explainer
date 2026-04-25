"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { analyzeContract, savePayload, loadPayload, clearPayload } from "@/lib/api";
import type { AnalyzeContractPayload } from "@/lib/types";
import { COLORS, fmtDate } from "@/lib/design";

type Status = "idle" | "uploading" | "analyzing" | "complete" | "error";

export default function WorkspacePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [last, setLast] = useState<{
    payload: AnalyzeContractPayload;
    fileName: string;
    ts: number;
  } | null>(null);

  useEffect(() => {
    setLast(loadPayload());
  }, []);

  async function handleFile(file: File) {
    setStatus("uploading");
    setError(null);
    setFileName(file.name);
    try {
      setStatus("analyzing");
      const payload = await analyzeContract(file);
      savePayload(payload, file.name);
      window.dispatchEvent(new Event("cre:payload-changed"));
      setStatus("complete");
      setLast({ payload, fileName: file.name, ts: Date.now() });
      router.push("/dashboard");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function reset() {
    clearPayload();
    setLast(null);
    setStatus("idle");
    setError(null);
    setFileName(null);
    window.dispatchEvent(new Event("cre:payload-changed"));
  }

  const summary = last?.payload.summary;
  const risky = summary?.risky ?? 0;
  const total = summary?.clause_count ?? 0;

  return (
    <div className="flex-1 overflow-auto px-12 py-10 max-w-[1280px] mx-auto w-full">
      <div className="mb-8">
        <div className="label-mono mb-2">WORKSPACE</div>
        <h1 className="serif text-[36px] leading-[1.1] mb-2 text-ink">
          {last
            ? risky > 0
              ? `You have ${risky} risky finding${risky === 1 ? "" : "s"} to review.`
              : "All caught up — last analysis is clean."
            : "Upload a contract to get started."}
        </h1>
        <p className="text-muted text-[14px] max-w-xl">
          Contract Risk Explainer splits your contract into clauses, scores
          each clause, and shows you exactly which words drove the decision.
        </p>
      </div>

      {/* Upload card */}
      <div className="bg-surface border border-hair rounded p-8 mb-6">
        <div className="flex items-start gap-6">
          <div className="w-12 h-12 rounded bg-bg flex items-center justify-center text-[22px] text-ink shrink-0">
            ⬆
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] font-semibold mb-1">
              Upload contract (PDF)
            </h2>
            <p className="text-muted text-[13px] mb-4">
              We&apos;ll extract the text, split clauses, classify each one for
              risk, and run an attribution explainer.
            </p>

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            <div className="flex gap-2 items-center">
              <button
                className="btn-solid"
                onClick={() => inputRef.current?.click()}
                disabled={status === "uploading" || status === "analyzing"}
              >
                Choose file
              </button>
              {(status === "uploading" || status === "analyzing") && (
                <span className="text-[12px] text-muted flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{
                      background: COLORS.medium,
                      animation: "pulse 1.4s ease-in-out infinite",
                    }}
                  />
                  {status === "uploading"
                    ? `Uploading ${fileName}…`
                    : `Analysing ${fileName} — this may take 30–90s`}
                </span>
              )}
              {status === "error" && (
                <span className="text-[12px]" style={{ color: COLORS.high }}>
                  {error}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Last analysis */}
      {last && (
        <div className="bg-surface border border-hair rounded">
          <div className="px-6 py-4 border-b border-hair flex items-center gap-3">
            <div className="label-mono">PORTFOLIO</div>
            <span className="text-[13px] text-muted">
              Last analysis · {fmtDate(last.ts)}
            </span>
            <button
              className="btn-ghost ml-auto"
              onClick={reset}
              title="Forget last analysis"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-4 divide-x divide-hair">
            <Stat label="Clauses" value={`${total}`} />
            <Stat
              label="High"
              value={`${summary?.high ?? 0}`}
              color={COLORS.high}
            />
            <Stat
              label="Medium"
              value={`${summary?.medium ?? 0}`}
              color={COLORS.medium}
            />
            <Stat
              label="Low risk"
              value={`${summary?.low ?? 0}`}
              color={COLORS.low}
            />
          </div>

          <div className="grid grid-cols-[1fr_110px_220px_120px_90px] px-6 py-3 border-t border-hair text-[11.5px] uppercase tracking-wider text-muted gap-3">
            <div>Document</div>
            <div>Status</div>
            <div>Risk distribution</div>
            <div>Clauses</div>
            <div className="text-right">Action</div>
          </div>
          <DocRow
            name={last.fileName}
            risky={risky}
            total={total}
            high={summary?.high ?? 0}
            medium={summary?.medium ?? 0}
            low={summary?.low ?? 0}
            onOpen={() => router.push("/dashboard")}
          />
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="px-6 py-4">
      <div className="label-mono mb-1">{label}</div>
      <div
        className="serif text-[28px] leading-none"
        style={{ color: color ?? COLORS.ink }}
      >
        {value}
      </div>
    </div>
  );
}

function DocRow({
  name,
  risky,
  total,
  high,
  medium,
  low,
  onOpen,
}: {
  name: string;
  risky: number;
  total: number;
  high: number;
  medium: number;
  low: number;
  onOpen: () => void;
}) {
  const ok = total - risky;
  const status =
    risky === 0 ? "All clear" : high > 0 ? "Needs review" : "In progress";
  return (
    <div className="grid grid-cols-[1fr_110px_220px_120px_90px] px-6 py-4 border-t border-hair items-center gap-3 hover:bg-bg2 cursor-pointer" onClick={onOpen}>
      <div className="text-[13px] truncate">{name}</div>
      <div className="text-[12px] text-muted">{status}</div>
      <div className="flex h-1.5 rounded overflow-hidden bg-hair">
        {high > 0 && (
          <div style={{ flex: high, background: COLORS.high }} />
        )}
        {medium > 0 && (
          <div style={{ flex: medium, background: COLORS.medium }} />
        )}
        {low > 0 && <div style={{ flex: low, background: COLORS.low }} />}
        {ok > 0 && <div style={{ flex: ok, background: COLORS.hair2 }} />}
      </div>
      <div className="text-[12px] text-muted">
        {risky}/{total} risky
      </div>
      <div className="text-right">
        <button className="btn-ghost" onClick={onOpen}>
          Open
        </button>
      </div>
    </div>
  );
}
