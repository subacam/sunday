const LABEL_TEXT = { positive: "긍정", neutral: "중립", negative: "부정" };

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function renderReviewList(container, reviews, reviewLabels) {
  const labelByIndex = new Map((reviewLabels ?? []).map((r) => [r.index, r.label]));

  if (!reviews?.length) {
    container.innerHTML = '<p style="font-size:12px;color:#9ca3af;margin:0">리뷰가 없습니다</p>';
    return;
  }

  container.innerHTML = reviews
    .map((review) => {
      const label = labelByIndex.get(review.index) ?? "neutral";
      const meta = [review.rating != null ? `★${review.rating}` : null, review.date].filter(Boolean).join(" · ");
      return `
        <div class="reviewItem">
          <div class="reviewItemHead">
            <span>${escapeHtml(meta)}</span>
            <span class="sentimentTag ${label}">${LABEL_TEXT[label] ?? label}</span>
          </div>
          <div>${escapeHtml(review.text)}</div>
        </div>
      `;
    })
    .join("");
}
