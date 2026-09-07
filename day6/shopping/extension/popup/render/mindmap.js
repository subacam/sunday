function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function renderMindmap(container, keywords, keywordRelations) {
  if (!keywords?.length) {
    container.innerHTML = '<p style="font-size:12px;color:#9ca3af;margin:0">키워드를 찾지 못했습니다</p>';
    return;
  }

  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const layoutR = 110;
  const weights = keywords.map((k) => k.weight ?? 1);
  const maxWeight = Math.max(...weights, 1);
  const minWeight = Math.min(...weights, 1);

  const positions = new Map();
  keywords.forEach((kw, i) => {
    const angle = (2 * Math.PI * i) / keywords.length - Math.PI / 2;
    positions.set(kw.id, {
      x: cx + layoutR * Math.cos(angle),
      y: cy + layoutR * Math.sin(angle),
    });
  });

  const edges = (keywordRelations ?? [])
    .filter((rel) => positions.has(rel.source) && positions.has(rel.target))
    .map((rel) => {
      const a = positions.get(rel.source);
      const b = positions.get(rel.target);
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#d1d5db" stroke-width="1.5" />`;
    })
    .join("");

  const nodes = keywords
    .map((kw) => {
      const pos = positions.get(kw.id);
      const weight = kw.weight ?? 1;
      const t = maxWeight === minWeight ? 0.5 : (weight - minWeight) / (maxWeight - minWeight);
      const radius = 16 + t * 14;
      return `
        <g>
          <circle cx="${pos.x}" cy="${pos.y}" r="${radius}" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5" />
          <text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#1e3a8a">${escapeHtml(kw.label)}</text>
        </g>
      `;
    })
    .join("");

  container.innerHTML = `
    <svg width="100%" viewBox="0 0 ${size} ${size}" role="img" aria-label="키워드 마인드맵">
      ${edges}
      ${nodes}
    </svg>
  `;
}
