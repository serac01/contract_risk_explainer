"use client";

import { useEffect, useState } from "react";
import { loadPayload } from "@/lib/api";
import type { AnalyzeContractPayload } from "@/lib/types";

export function usePayload(): {
  payload: AnalyzeContractPayload | null;
  fileName: string | null;
  ts: number | null;
  loaded: boolean;
} {
  const [state, setState] = useState<{
    payload: AnalyzeContractPayload | null;
    fileName: string | null;
    ts: number | null;
    loaded: boolean;
  }>({ payload: null, fileName: null, ts: null, loaded: false });

  useEffect(() => {
    const refresh = () => {
      const stored = loadPayload();
      if (stored) {
        setState({
          payload: stored.payload,
          fileName: stored.fileName,
          ts: stored.ts,
          loaded: true,
        });
      } else {
        setState({ payload: null, fileName: null, ts: null, loaded: true });
      }
    };
    refresh();
    window.addEventListener("cre:payload-changed", refresh);
    return () => window.removeEventListener("cre:payload-changed", refresh);
  }, []);

  return state;
}
