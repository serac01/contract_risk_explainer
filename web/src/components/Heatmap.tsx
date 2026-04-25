import type { AttributionToken } from "@/lib/types";

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const num = parseInt(v, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

export function Heatmap({
  text,
  tokens,
  hl,
}: {
  text: string;
  tokens: AttributionToken[];
  hl: string;
}) {
  if (!tokens || tokens.length === 0) {
    return <span>{text}</span>;
  }
  const sorted = [...tokens]
    .filter((t) => t.score > 0 && t.start >= 0 && t.end <= text.length)
    .sort((a, b) => a.start - b.start);

  if (sorted.length === 0) return <span>{text}</span>;

  const max = Math.max(...sorted.map((t) => t.score), 0.001);
  const [r, g, b] = hexToRgb(hl);
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach((tok, i) => {
    if (tok.start > cursor) {
      pieces.push(
        <span key={`p${i}`}>{text.slice(cursor, tok.start)}</span>,
      );
    }
    const alpha = Math.min(0.55, 0.15 + (tok.score / max) * 0.45);
    pieces.push(
      <span
        key={`t${i}`}
        style={{
          background: `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`,
          padding: "0 1px",
          borderRadius: "2px",
        }}
        title={`${tok.token} · ${tok.score.toFixed(2)}`}
      >
        {text.slice(tok.start, tok.end)}
      </span>,
    );
    cursor = tok.end;
  });
  if (cursor < text.length) {
    pieces.push(<span key="tail">{text.slice(cursor)}</span>);
  }
  return <>{pieces}</>;
}
