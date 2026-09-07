// 실제 네이버 스마트스토어 상품 상세 페이지의 "리뷰" 미리보기 위젯(#REVIEW —
// 갤럭시 케이스류 상품 예시)과, "리뷰 전체보기" 클릭 후 뜨는 모달
// (#REVIEW_LIST_TOP > #REVIEW_LIST)의 실제 마크업을 사용자가 직접 캡처해준
// 스니펫으로 검증하며 작성됨 (day6/shopping/CLAUDE.md 참고).
//
// "리뷰 전체보기"는 페이지 이동도 인라인 확장도 아니라 별도 모달을 띄우고,
// 그 안의 리뷰 아이템은 미리보기 위젯과 마크업이 다르다: 위젯은
// `<a data-shp-contents-id>`, 모달은 `<li id="REVIEW_ITEM_{contentsId}">`.
// 평점도 위젯은 "평점" blind 텍스트 + 숫자가 `<strong>` 안에 있지만, 모달은
// "평점" 라벨 없이 svg 별 아이콘 바로 뒤에 숫자만 있다 (가끔 "한달사용"
// 배지가 붙어 "5한달사용"처럼 이어지기도 함). 리뷰 본문/옵션도 위젯은 클래스
// 기반(`.W2ktnZBARU`, 패턴 매칭)이었지만 모달은 `id="review_content_{id}"`,
// `id="review_option_{id}"`처럼 리뷰 콘텐츠 id에 묶인 안정적인 id를 쓴다 —
// 빌드마다 바뀌는 해시 클래스보다 신뢰도가 높아 이 id를 우선 사용한다.
//
// 모달을 스크롤하면 리뷰가 더 로드되는 것은 사용자가 직접 확인했다 ("더보기"
// 버튼은 안 보였다고 함). 다만 실제로 스크롤해야 하는 대상이 `document.body`
// 인지 모달 내부의 별도 스크롤 컨테이너인지는 정적 마크업만으로 알 수 없어
// (인라인 overflow 스타일이 안 보임), 리뷰 아이템의 스크롤 가능한 조상을
// 찾아 그걸 스크롤하도록 구현했다 — 이 부분은 아직 실제 스크롤 로드 트리거
// 여부가 라이브로 확인되지 않았다.

const DATE_PATTERN = /^\d{2}\.\d{2}\.\d{2}\.$/;
const RATING_PATTERN = /평점\s*(\d+(?:\.\d+)?)/;

function extractProductName() {
  // TODO(검증 필요): 상품 헤더 HTML을 보지 못해 coupang.js와 동일하게 h1 /
  // document.title 폴백을 사용한다.
  const h1 = document.querySelector("h1");
  const h1Text = ShoppingReviewCommon.cleanReviewText(h1?.textContent);
  if (h1Text) return h1Text;

  const title = document.title || "";
  const stripped = ShoppingReviewCommon.cleanReviewText(title.replace(/\s*[:|].*$/, ""));
  return stripped || "상품";
}

function findReviewItems() {
  // "리뷰 전체보기" 모달이 열려 있으면 그 안의 전체 리뷰 목록을 우선 사용하고
  // (모달이 없으면 querySelectorAll이 빈 NodeList를 반환하므로 안전하게
  // 미리보기 위젯 쪽으로 폴백된다), 없으면 상품 페이지에 처음 렌더링되는
  // 미리보기 위젯(#REVIEW)의 항목을 쓴다. 위젯 쪽은 같은 곳에 포토 썸네일
  // 리스트도 data-shp-contents-type="review"를 쓰지만
  // data-shp-area-id="thumnailrec"(원문 그대로의 오타)라서
  // data-shp-area-id="review"로 실제 리뷰 항목만 골라낸다.
  const modalItems = document.querySelectorAll('#REVIEW_LIST li[id^="REVIEW_ITEM_"]');
  if (modalItems.length) return modalItems;
  return document.querySelectorAll('a[data-shp-contents-type="review"][data-shp-area-id="review"]');
}

function itemContentId(item) {
  // 모달 항목(<li id="REVIEW_ITEM_5031568140">)은 id에서 바로 뽑고, 위젯
  // 항목(<a data-shp-contents-id="...">)은 그 속성에서 뽑는다.
  if (item.id?.startsWith("REVIEW_ITEM_")) return item.id.slice("REVIEW_ITEM_".length);
  return item.getAttribute("data-shp-contents-id") ?? "";
}

function extractRating(item) {
  // 미리보기 위젯: <strong>에 "평점" blind 텍스트 + 숫자.
  const strong = item.querySelector("strong");
  if (strong) {
    const match = strong.textContent.match(RATING_PATTERN);
    if (match) return Number(match[1]);
  }
  // 모달 리스트: "평점" 라벨 없이 svg 별 아이콘 바로 뒤에 숫자만 온다
  // (가끔 "5한달사용"처럼 "한달사용" 배지 텍스트가 바로 이어붙기도 함) —
  // svg를 첫 자식으로 둔 엘리먼트 중 텍스트가 숫자로 시작하는 걸 찾는다.
  for (const el of item.querySelectorAll("div")) {
    if (el.firstElementChild?.tagName?.toLowerCase() !== "svg") continue;
    const match = el.textContent.trim().match(/^(\d+(?:\.\d+)?)/);
    if (match) return Number(match[1]);
  }
  return null;
}

function extractDate(item) {
  const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent.trim();
    if (DATE_PATTERN.test(text)) return text;
  }
  return null;
}

function leafTextDivs(item) {
  return [...item.querySelectorAll("div")].filter((div) => div.children.length === 0 && div.textContent.trim());
}

function extractReviewText(item) {
  // 모달 리스트: <p id="review_content_5031568140">에 본문이 그대로 들어있다
  // — 리뷰 콘텐츠 id에 묶인 id라 클래스명보다 훨씬 안정적이라 우선 사용.
  const byId = item.querySelector('p[id^="review_content_"]');
  if (byId) return ShoppingReviewCommon.cleanReviewText(byId.textContent);

  // 미리보기 위젯: 캡처한 마크업 기준 본문 클래스는 "W2ktnZBARU"이지만
  // 빌드마다 바뀌는 해시 클래스일 위험이 있어, 못 찾으면 "자식 없는 텍스트
  // div 중 가장 긴 것"으로 폴백한다 — 실제로도 리뷰 본문이 거의 항상 가장
  // 길다.
  const known = item.querySelector(".W2ktnZBARU");
  if (known) return ShoppingReviewCommon.cleanReviewText(known.textContent);

  const candidates = leafTextDivs(item);
  if (!candidates.length) return "";
  const longest = candidates.reduce((a, b) => (b.textContent.length > a.textContent.length ? b : a));
  return ShoppingReviewCommon.cleanReviewText(longest.textContent);
}

function extractOption(item) {
  // 모달 리스트: id="review_option_{id}"로 감싼 div 안에 <button><span
  // class="dzRGJZVBXB">색상: .../적용모델: ...</span></button>가 있고, 그
  // 옆(형제) div에 그립감/무게/사이즈 같은 태그 정보가 따로 있다. button의
  // textContent만 취하면 태그 정보 없이 옵션 텍스트만 깔끔하게 나온다.
  const optionButton = item.querySelector('[id^="review_option_"] button');
  if (optionButton) return ShoppingReviewCommon.cleanReviewText(optionButton.textContent);

  // 미리보기 위젯: "색상: 블루바이올렛 / 적용모델: 갤럭시S26 울트라" 형태 —
  // ":"와 "/"를 모두 포함하는 짧은 leaf div로 식별한다 (클래스명 기반 대신
  // 패턴 기반).
  const candidates = leafTextDivs(item);
  const optionLike = candidates.find(
    (div) => div.textContent.length < 120 && div.textContent.includes(":") && div.textContent.includes("/")
  );
  return optionLike ? ShoppingReviewCommon.cleanReviewText(optionLike.textContent) : null;
}

function collectVisibleReviews() {
  return [...findReviewItems()]
    .map((item) => ({
      text: extractReviewText(item),
      rating: extractRating(item),
      date: extractDate(item),
      option: extractOption(item),
    }))
    .filter((review) => review.text);
}

function findReviewSectionRoot() {
  // 모달이 열려 있으면 그 안(#REVIEW_LIST_TOP)에서 "더보기" 같은 버튼을
  // 찾아야 한다 — 모달이 #REVIEW 위젯 밖(포털)에 렌더링될 가능성이 높아서.
  return document.querySelector("#REVIEW_LIST_TOP") ?? document.querySelector("#REVIEW") ?? document.body;
}

function findButtonByText(root, predicate) {
  return [...root.querySelectorAll("button")].find((btn) =>
    predicate(ShoppingReviewCommon.cleanReviewText(btn.textContent))
  );
}

// 리뷰 목록이 실제로 바뀌었는지 판단하는 기준. MutationObserver보다 직접
// 신호(data-shp-contents-id 시퀀스)를 비교하는 쪽이, 프레임워크가 노드를
// 재사용하며 텍스트만 갱신하는 경우에도 안정적으로 감지된다.
function reviewIdSignature() {
  return [...findReviewItems()].map(itemContentId).join(",");
}

async function pollForChange(before, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (reviewIdSignature() !== before) return true;
  }
  return false;
}

let expandedFullList = false;

async function advanceReviews() {
  const root = findReviewSectionRoot();
  const before = reviewIdSignature();

  if (!expandedFullList) {
    expandedFullList = true;
    const expandButton = findButtonByText(root, (text) => text.startsWith("리뷰 전체보기"));
    if (expandButton) {
      ShoppingReviewCommon.simulateClick(expandButton);
      return await pollForChange(before, 5000);
    }
  }

  const moreButton = findButtonByText(root, (text) => text.startsWith("더보기") || text.startsWith("리뷰 더보기"));
  if (moreButton && !moreButton.disabled) {
    ShoppingReviewCommon.simulateClick(moreButton);
    return await pollForChange(before, 5000);
  }

  // 사용자가 실제로 확인한 대로 모달은 "더보기" 버튼 없이 스크롤로 더
  // 로드된다. 모달이 자체 스크롤 컨테이너를 쓸 수 있어 document.body를
  // 스크롤하는 것만으로는 안 먹힐 수 있으므로, 마지막 리뷰 아이템의 실제
  // 스크롤 가능한 조상을 찾아 그걸 스크롤한다.
  const items = [...findReviewItems()];
  const lastItem = items[items.length - 1];
  const scrollTarget = lastItem ? findScrollableAncestor(lastItem) : (document.scrollingElement ?? document.body);
  scrollTarget.scrollTo({ top: scrollTarget.scrollHeight, behavior: "instant" });
  return await pollForChange(before, 3000);
}

function findScrollableAncestor(el) {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return document.scrollingElement ?? document.body;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "PARSE_REVIEWS") return false;

  expandedFullList = false;

  (async () => {
    try {
      const { reviews, truncated } = await ShoppingReviewCommon.collectReviewsLoop({
        collectVisible: collectVisibleReviews,
        advance: advanceReviews,
        targetCount: message.targetCount,
      });
      sendResponse({
        ok: true,
        platform: "naver",
        productName: extractProductName(),
        reviews: reviews.map((r, i) => ({ ...r, index: i })),
        truncated,
        warnings: [],
      });
    } catch (err) {
      console.error("[naver content script] parse failed:", err);
      sendResponse({ ok: false, error: "PARSE_ERROR" });
    }
  })();

  return true;
});
