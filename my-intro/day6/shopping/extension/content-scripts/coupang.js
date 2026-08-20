// 실제 쿠팡 상품 상세 페이지(https://www.coupang.com/vp/products/... , 예:
// 9086859493 "EZn이지엔 김장봉투")의 리뷰 섹션 HTML을 사용자가 직접 캡처해
// 전달한 스니펫으로 검증한 뒤 작성됨 (day6/shopping/CLAUDE.md 참고). 클래스명이
// "twc-text-[14px]/[15px]" 같은 유틸리티 클래스(아마 사내 디자인 시스템의
// 자동 생성 클래스)라 쿠팡이 스타일을 조금만 리빌드해도 깨지기 쉽다 — 그래서
// 가능한 한 클래스명이 아니라 안정적인 신호(article 태그, data-review-id 속성,
// translate="no" 속성, -webkit-line-clamp 계산 스타일, 날짜 정규식)로 선택자를
// 잡았다. 검증은 상품 1개, 페이지네이션 1→2 이동까지만 확인했고 실제 크롬
// 팝업을 통한 end-to-end 실행은 아직 못 했다 — "Checking your work" 절차를
// 거쳐야 한다.

const DATE_PATTERN = /^\d{4}\.\d{2}\.\d{2}$/;

function extractProductName() {
  // TODO(검증 필요): 상품 헤더 HTML을 직접 보지 못해 h1 우선 + document.title
  // 후처리로 대체한 상태. 실제 페이지에서 상품명이 다른 태그에 있다면 교체할 것.
  const h1 = document.querySelector("h1");
  const h1Text = ShoppingReviewCommon.cleanReviewText(h1?.textContent);
  if (h1Text) return h1Text;

  const title = document.title || "";
  const stripped = ShoppingReviewCommon.cleanReviewText(title.replace(/\s*[:|].*$/, ""));
  return stripped || "상품";
}

function findReviewArticles() {
  const helpfulEls = document.querySelectorAll(".js_reviewArticleHelpfulContainer[data-review-id]");
  const articles = [];
  for (const el of helpfulEls) {
    const article = el.closest("article");
    if (article) articles.push(article);
  }
  return articles;
}

function extractRating(article) {
  const stars = article.querySelectorAll("i");
  let full = 0;
  let total = 0;
  for (const star of stars) {
    const cls = star.className;
    if (typeof cls !== "string") continue;
    if (cls.includes("bg-full-star")) {
      full++;
      total++;
    } else if (cls.includes("bg-empty-star")) {
      total++;
    }
  }
  return total > 0 ? full : null;
}

function extractDate(article) {
  const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (DATE_PATTERN.test(text)) return text;
  }
  return null;
}

function extractReviewText(article) {
  const span = article.querySelector('span[translate="no"]');
  if (!span) return "";
  const withNewlines = span.innerHTML.replace(/<br\s*\/?>/gi, "\n");
  const tmp = document.createElement("div");
  tmp.innerHTML = withNewlines;
  return ShoppingReviewCommon.cleanReviewText(tmp.textContent);
}

function extractOption(article) {
  const directDivs = article.querySelectorAll(":scope > div");
  for (const div of directDivs) {
    const clamp = window.getComputedStyle(div).webkitLineClamp;
    if (clamp && clamp !== "none") {
      const text = ShoppingReviewCommon.cleanReviewText(div.textContent);
      return text || null;
    }
  }
  return null;
}

function collectVisibleReviews() {
  return findReviewArticles()
    .map((article) => ({
      text: extractReviewText(article),
      rating: extractRating(article),
      date: extractDate(article),
      option: extractOption(article),
    }))
    .filter((review) => review.text);
}

function findPaginationContainer() {
  return document.querySelector("[data-start][data-end][data-page]");
}

// 리뷰 목록이 실제로 바뀌었는지 판단하는 기준. MutationObserver 대신 이걸
// 직접 폴링하는 이유: React가 article 컨테이너를 재사용하고 안의 텍스트
// 노드만 갱신하는 경우 childList 뮤테이션이 아예 안 잡힐 수 있어서다.
function reviewIdSignature() {
  return [...document.querySelectorAll(".js_reviewArticleHelpfulContainer[data-review-id]")]
    .map((el) => el.getAttribute("data-review-id"))
    .join(",");
}

async function advanceReviews() {
  const pagination = findPaginationContainer();
  if (!pagination) {
    console.warn("[coupang content script] advanceReviews: no pagination container found");
    return false;
  }

  const buttons = pagination.querySelectorAll("button");
  const nextButton = buttons[buttons.length - 1];
  if (!nextButton || nextButton.disabled) {
    console.warn("[coupang content script] advanceReviews: next button missing or disabled", {
      page: pagination.dataset.page,
      start: pagination.dataset.start,
      end: pagination.dataset.end,
      buttonCount: buttons.length,
    });
    return false;
  }

  const before = reviewIdSignature();
  const pageBefore = pagination.dataset.page;
  ShoppingReviewCommon.simulateClick(nextButton);

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (reviewIdSignature() !== before) return true;
  }
  console.warn("[coupang content script] advanceReviews: click did not change review list within 5s", {
    pageBefore,
    pageAfter: findPaginationContainer()?.dataset.page,
  });
  return false;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "PARSE_REVIEWS") return false;

  (async () => {
    try {
      const { reviews, truncated } = await ShoppingReviewCommon.collectReviewsLoop({
        collectVisible: collectVisibleReviews,
        advance: advanceReviews,
        targetCount: message.targetCount,
      });
      sendResponse({
        ok: true,
        platform: "coupang",
        productName: extractProductName(),
        reviews: reviews.map((r, i) => ({ ...r, index: i })),
        truncated,
        warnings: [],
      });
    } catch (err) {
      console.error("[coupang content script] parse failed:", err);
      sendResponse({ ok: false, error: "PARSE_ERROR" });
    }
  })();

  return true;
});
