// Brand: "Veridict" — verum (truth) + verdict. A contract risk reviewer.
// Logomark: a serif "V" with a notched corner, suggesting a redline.

window.BRAND = {
  name: "Veridict",
  tagline: "Read the contract you actually signed.",
  Logomark: function ({ size = 22, color = "currentColor", bg = null }) {
    const s = size;
    return React.createElement("svg", {
      width: s, height: s, viewBox: "0 0 24 24", style: { display: "block", flexShrink: 0 },
    },
      bg && React.createElement("rect", { width: 24, height: 24, rx: 4, fill: bg }),
      // Stylized V with a left serif and a redline notch on the right stem
      React.createElement("path", {
        d: "M4.5 5.5 L8 5.5 L11.6 16.2 L14.6 7.5 L13.2 7.5 L13.2 5.5 L19.5 5.5 L19.5 7.5 L18 7.5 L13.2 19 L10.4 19 Z",
        fill: color,
      }),
      // Redline: a small horizontal mark across one arm
      React.createElement("rect", {
        x: 14.5, y: 11.5, width: 4.2, height: 1.1, fill: color, opacity: 0.55, transform: "rotate(-65 16.6 12)",
      }),
    );
  },
  Wordmark: function ({ size = 16, color = "currentColor" }) {
    return React.createElement("span", {
      style: {
        fontFamily: '"Source Serif 4", Georgia, serif',
        fontSize: size, fontWeight: 600, letterSpacing: -0.4, color,
        fontFeatureSettings: '"ss01"',
      },
    }, "Veridict");
  },
};
