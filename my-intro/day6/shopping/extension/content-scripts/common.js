// 쿠팡/네이버 content script가 공유하는 헬퍼. manifest.json의 content_scripts에서
// 사이트별 파일보다 먼저 로드되며, 같은 격리 월드(isolated world) 전역 스코프를
// 공유하므로 별도 번들링/모듈 시스템 없이 `ShoppingReviewCommon.xxx`로 바로 호출 가능.
(() => {
  function cleanReviewText(text) {
    return (text ?? "").replace(/\s+/g, " ").trim();
  }

  function hashReview(text, date) {
    const input = `${text}::${date ?? ""}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31 + input.charCodeAt(i)) | 0;
    }
    return hash;
  }

  /**
   * `container` 내부에 변화가 생기거나 timeoutMs가 지날 때까지 기다린다.
   * blind sleep 대신 MutationObserver를 쓰기 위한 헬퍼 — 무한스크롤/더보기
   * 클릭 후 새 리뷰가 실제로 DOM에 붙는 시점을 감지하는 데 사용.
   */
  function waitForMutation(container, timeoutMs) {
    return new Promise((resolve) => {
      let settled = false;
      const observer = new MutationObserver(() => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        resolve(true);
      });
      observer.observe(container, { childList: true, subtree: true });
      setTimeout(() => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        resolve(false);
      }, timeoutMs);
    });
  }

  /**
   * `el.click()`만으로는 페이지네이션/더보기 버튼을 못 누르는 경우가 있다 —
   * React 등에서 클릭 핸들러를 pointerdown/mousedown에 걸어둔 컴포넌트는
   * 합성 click 이벤트 하나만으로는 반응하지 않는다. 실제 클릭에 가깝게
   * pointerdown → mousedown → pointerup → mouseup → click 순으로 이벤트를
   * 쏴서 어떤 방식으로 바인딩돼 있어도 걸리도록 한다.
   */
  function simulateClick(el) {
    const rect = el.getBoundingClientRect();
    const eventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      const EventCtor = type.startsWith("pointer") && typeof PointerEvent !== "undefined" ? PointerEvent : MouseEvent;
      el.dispatchEvent(new EventCtor(type, eventInit));
    }
  }

  function sendProgress(count, target) {
    try {
      chrome.runtime.sendMessage({ type: "PARSE_PROGRESS", count, target });
    } catch {
      // 팝업/백그라운드가 아직 리스닝하지 않는 순간의 메시지는 무시해도 안전.
    }
  }

  /**
   * 리뷰 수집 공통 루프. `collectVisible`은 현재 화면에 보이는 리뷰를
   * ParsedReview[] 형태로 반환해야 한다 (별점만 있고 본문이 없는 리뷰는
   * 각 사이트 스크립트가 이미 걸러서 넘긴다). `advance`는 "더보기" 클릭 또는
   * 스크롤 등 다음 페이지를 불러오는 동작을 수행하고, 컨테이너에 변화가
   * 있었으면 true를 반환해야 한다 (waitForMutation과 조합해서 구현).
   *
   * targetCount(예: 300)에 못 미쳐도 advance()가 더 이상 진행이 안 될 때(연속
   * 2회 실패)는 에러 없이 그때까지 모은 것으로 반환한다 — "별점만 있는 리뷰를
   * 뺐더니 300개가 안 되지만 더 가져올 것도 없다"는 상황은 이미 정상 흐름으로
   * 처리된다. maxIterations는 그 흐름과 별개로 존재하는 안전장치일 뿐이다:
   * 리뷰가 총 수천 개인 상품에서 본문 있는 리뷰 비율이 낮으면, 실제로는 더
   * 가져올 리뷰가 남아있는데도 이 반복 횟수 상한에 먼저 걸려 300개를 못 채운
   * 채 끝날 수 있다 — 그런 상품에서도 여유 있게 동작하도록 기본값을
   * 넉넉하게 잡았다.
   */
  async function collectReviewsLoop({ collectVisible, advance, targetCount, maxIterations = 60 }) {
    const seen = new Map();
    let noNewContentStreak = 0;

    for (let i = 0; i < maxIterations; i++) {
      const visible = collectVisible();
      for (const review of visible) {
        const key = hashReview(review.text, review.date);
        if (!seen.has(key)) seen.set(key, review);
      }

      sendProgress(seen.size, targetCount);

      if (seen.size >= targetCount) {
        return { reviews: [...seen.values()].slice(0, targetCount), truncated: seen.size > targetCount };
      }

      const sizeBefore = seen.size;
      const advanced = await advance();
      const grew = seen.size > sizeBefore || advanced;

      noNewContentStreak = grew ? 0 : noNewContentStreak + 1;
      if (noNewContentStreak >= 2) break;
    }

    return { reviews: [...seen.values()], truncated: false };
  }

  window.ShoppingReviewCommon = {
    cleanReviewText,
    hashReview,
    waitForMutation,
    simulateClick,
    sendProgress,
    collectReviewsLoop,
  };
})();
