"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loadPayload } from "@/lib/api";

const NAV = [
  { href: "/workspace", label: "Workspace", requiresDoc: false },
  { href: "/dashboard", label: "Risk briefing", requiresDoc: true },
  { href: "/document", label: "Document", requiresDoc: true },
  { href: "/stream", label: "Stream", requiresDoc: true },
  { href: "/redline", label: "Redline", requiresDoc: true },
];

export function TopBar() {
  const pathname = usePathname();
  const [doc, setDoc] = useState<{ name: string; risky: number } | null>(null);

  useEffect(() => {
    const refresh = () => {
      const stored = loadPayload();
      if (stored) {
        setDoc({ name: stored.fileName, risky: stored.payload.summary.risky });
      } else {
        setDoc(null);
      }
    };
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("cre:payload-changed", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cre:payload-changed", onStorage);
    };
  }, [pathname]);

  return (
    <header className="h-[52px] border-b border-hair bg-bg2 flex items-center px-6 gap-4 shrink-0">
      <div className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="Veridict"
          width={120}
          height={50}
          priority
          className="h-8 w-auto"
        />
        <div className="w-px h-5 bg-hair mx-2" />
      </div>

      {doc && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="label-mono">ACTIVE</span>
          <span className="text-[13px] truncate max-w-[280px]" title={doc.name}>
            {doc.name}
          </span>
          {doc.risky > 0 && (
            <span className="mono text-[11px] px-1.5 py-0.5 border border-hair rounded text-muted">
              {doc.risky} risky
            </span>
          )}
        </div>
      )}

      <nav className="ml-auto flex items-center gap-1">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname?.startsWith(n.href + "/");
          const disabled = n.requiresDoc && !doc;
          return (
            <Link
              key={n.href}
              href={disabled ? "#" : n.href}
              aria-disabled={disabled}
              onClick={(e) => disabled && e.preventDefault()}
              className={[
                "px-3 py-1.5 text-[12.5px] rounded transition-colors",
                active
                  ? "bg-ink text-bg"
                  : disabled
                    ? "text-muted opacity-45 cursor-not-allowed"
                    : "text-ink hover:bg-hair",
              ].join(" ")}
            >
              {n.label}
            </Link>
          );
        })}
        <div className="w-px h-5 bg-hair mx-3" />
        <div className="w-[26px] h-[26px] rounded-full bg-ink text-bg flex items-center justify-center mono text-[10.5px] font-semibold">
          DV
        </div>
      </nav>
    </header>
  );
}
