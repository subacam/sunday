function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderList(items) {
  if (!items?.length) return "<p style=\"font-size:12px;color:#9ca3af;margin:0\">내용 없음</p>";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function renderInsights(container, insights) {
  container.innerHTML = `
    <div>
      <h3>💪 마케팅 포인트 (강점)</h3>
      ${renderList(insights.strengths)}
      <h3>🔧 개선 필요</h3>
      ${renderList(insights.improvements)}
    </div>
  `;
}
