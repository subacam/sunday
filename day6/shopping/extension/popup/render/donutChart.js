const COLORS = { positive: "#22c55e", neutral: "#9ca3af", negative: "#ef4444" };

export function renderDonutChart(container, sentiment) {
  const segments = [
    { key: "positive", label: "긍정", emoji: "😊", pct: sentiment.positivePct },
    { key: "neutral", label: "중립", emoji: "😐", pct: sentiment.neutralPct },
    { key: "negative", label: "부정", emoji: "😞", pct: sentiment.negativePct },
  ];

  const size = 88;
  const r = 36;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  let cumulativePct = 0;
  const circles = segments
    .filter((s) => s.pct > 0)
    .map((s) => {
      const dash = (s.pct / 100) * circumference;
      const offset = -((cumulativePct / 100) * circumference);
      cumulativePct += s.pct;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLORS[s.key]}" stroke-width="${strokeWidth}" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt" />`;
    })
    .join("");

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="감성 비율 도넛 차트">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="${strokeWidth}" />
      ${circles}
    </svg>
  `;

  const legend = segments
    .map(
      (s) => `
      <div class="sentimentLegendRow">
        <span class="sentimentDot" style="background:${COLORS[s.key]}"></span>
        <span>${s.emoji} ${s.label} ${Math.round(s.pct)}%</span>
      </div>`
    )
    .join("");

  container.innerHTML = `${svg}<div class="sentimentLegend">${legend}</div>`;
}
