// Shared design tokens + utilities for the Contract Risk Explainer.
// Editorial palette: warm off-white, ink, with ochre/sand/sage for risk levels.
// All artboards consume this so a Tweak (palette, density) flows everywhere.

window.CRE = (function () {
  // ─── Palettes ────────────────────────────────────────────────
  const palettes = {
    editorial: {
      bg: "#f6f3ec",         // warm off-white paper
      surface: "#fbf9f4",
      ink: "#1f1c17",        // near-black, warm
      ink2: "#3a3530",
      muted: "#807870",
      hair: "#e3ddd1",       // hairlines
      // Risk
      high: "#a3471a",       // ochre / burnt
      highBg: "#f1d9c2",
      highWash: "rgba(163,71,26,0.10)",
      highHl: "rgba(163,71,26,0.28)",  // peak attribution
      med: "#9a7a2c",        // dark gold
      medBg: "#ece1bf",
      medWash: "rgba(154,122,44,0.10)",
      medHl: "rgba(154,122,44,0.26)",
      low: "#5a7150",        // sage
      lowBg: "#dde3d2",
      lowWash: "rgba(90,113,80,0.08)",
      lowHl: "rgba(90,113,80,0.22)",
      accent: "#1f1c17",
    },
    traffic: {
      bg: "#f7f7f6",
      surface: "#ffffff",
      ink: "#161616",
      ink2: "#333333",
      muted: "#7a7a7a",
      hair: "#e6e6e4",
      high: "#c0392b",
      highBg: "#fadbd6",
      highWash: "rgba(192,57,43,0.10)",
      highHl: "rgba(192,57,43,0.30)",
      med: "#c79016",
      medBg: "#f6e6c1",
      medWash: "rgba(199,144,22,0.10)",
      medHl: "rgba(199,144,22,0.28)",
      low: "#2f8a52",
      lowBg: "#cfe7da",
      lowWash: "rgba(47,138,82,0.08)",
      lowHl: "rgba(47,138,82,0.22)",
      accent: "#161616",
    },
    mono: {
      bg: "#f4f4f3",
      surface: "#ffffff",
      ink: "#0e0e0e",
      ink2: "#2a2a2a",
      muted: "#7c7c7c",
      hair: "#e0e0de",
      high: "#0e0e0e",
      highBg: "#cfcfcf",
      highWash: "rgba(0,0,0,0.08)",
      highHl: "rgba(0,0,0,0.30)",
      med: "#3a3a3a",
      medBg: "#dedede",
      medWash: "rgba(0,0,0,0.05)",
      medHl: "rgba(0,0,0,0.18)",
      low: "#6a6a6a",
      lowBg: "#ececec",
      lowWash: "rgba(0,0,0,0.03)",
      lowHl: "rgba(0,0,0,0.10)",
      accent: "#0e0e0e",
    },
  };

  // Density scales — controls font sizes & padding via Tweaks
  const densities = {
    compact:    { row: 8,  pad: 14, gap: 6,  fs: 12.5, fsBody: 13.5, lh: 1.45 },
    comfortable:{ row: 12, pad: 20, gap: 10, fs: 13,   fsBody: 15,   lh: 1.6  },
    cozy:       { row: 16, pad: 26, gap: 14, fs: 13.5, fsBody: 16,   lh: 1.7  },
  };

  const fonts = {
    body: '"Source Serif 4", "Source Serif Pro", "Iowan Old Style", "Georgia", serif',
    ui:   '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
  };

  // ─── Helpers ─────────────────────────────────────────────────
  function levelColor(level, p) {
    if (level === "high")   return { fg: p.high, bg: p.highBg, wash: p.highWash, hl: p.highHl };
    if (level === "medium") return { fg: p.med,  bg: p.medBg,  wash: p.medWash,  hl: p.medHl  };
    return { fg: p.low, bg: p.lowBg, wash: p.lowWash, hl: p.lowHl };
  }

  function levelGlyph(level) {
    if (level === "high") return "▲";
    if (level === "medium") return "■";
    return "●";
  }

  // Render clause text with token attribution as background highlights.
  // Each character gets the max alpha of any covering token, so overlapping
  // tokens compound smoothly. Returns array of <span>s.
  function renderHeatmap(text, tokens, hlColor, opts = {}) {
    if (!tokens || tokens.length === 0) return [text];
    const charScores = new Float32Array(text.length);
    for (const t of tokens) {
      const s = Math.max(0, t.start), e = Math.min(text.length, t.end);
      for (let i = s; i < e; i++) {
        if (t.score > charScores[i]) charScores[i] = t.score;
      }
    }
    const out = [];
    let i = 0, key = 0;
    while (i < text.length) {
      const score = charScores[i];
      let j = i + 1;
      while (j < text.length && Math.abs(charScores[j] - score) < 0.001) j++;
      const seg = text.slice(i, j);
      if (score > 0.01 && opts.show !== false) {
        // Map score (0..1) to alpha multiplier on hlColor, with a floor.
        const a = 0.18 + score * 0.55;
        out.push(
          React.createElement("mark", {
            key: key++,
            style: {
              background: hlColor.replace(/[\d.]+\)$/, a.toFixed(2) + ")"),
              color: "inherit",
              padding: "1px 0",
              borderRadius: 2,
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            },
          }, seg)
        );
      } else {
        out.push(React.createElement(React.Fragment, { key: key++ }, seg));
      }
      i = j;
    }
    return out;
  }

  // Tabular percent.
  const pct = (n) => (n == null ? "—" : Math.round(n * 100) + "%");

  return { palettes, densities, fonts, levelColor, levelGlyph, renderHeatmap, pct };
})();
