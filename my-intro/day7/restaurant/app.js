// API_CNV_063 스펙(맛집찾기_PRD.md 5.3)의 8개 고정 카테고리 + Stitch가 사용한 Material Symbols 아이콘 매핑.
var CATEGORIES = [
  { value: "한식", icon: "ramen_dining" },
  { value: "분식", icon: "restaurant_menu" },
  { value: "치킨", icon: "kebab_dining" },
  { value: "동양식", icon: "tapas" },
  { value: "서양식", icon: "local_pizza" },
  { value: "패스트푸드", icon: "fastfood" },
  { value: "뷔페", icon: "restaurant" },
  { value: "퓨전", icon: "set_meal" }
];

// 서울 25개 자치구. areaNm은 시/도·시/군구를 구분하지 않는 단일 텍스트 파라미터라(PRD 5.5),
// 검색 범위를 서울로 고정하고 자치구 이름을 그대로 넘기면 된다.
var REGIONS = [
  "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구",
  "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구",
  "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구"
];

var PAGE_SIZE = 10;

// API 응답에는 사진 필드가 없어(PRD 5.3), 카드 상단은 사진 대신 카테고리 아이콘 타일로 대체함.
// totalCount는 실측 결과 조건과 무관하게 고정값이라(server.js 주석 참고) 신뢰하지 않고,
// 대신 "받은 개수 == numOfRows"일 때만 다음 페이지가 더 있다고 가정해 더보기 버튼을 노출한다.

var state = { region: "", category: "", pageNo: 1, items: [], hasMore: false };

function fetchRestaurants(region, category, pageNo) {
  var params = new URLSearchParams({
    areaNm: region,
    clNm: category,
    pageNo: String(pageNo),
    numOfRows: String(PAGE_SIZE)
  });
  return fetch("/api/restaurants?" + params.toString()).then(function (res) {
    if (!res.ok) throw new Error("http_" + res.status);
    return res.json();
  });
}

function $(id) { return document.getElementById(id); }

function renderRegionField() {
  var field = $("regionField");
  field.innerHTML =
    '<label class="font-label-md text-label-md text-on-surface block" for="region">지역 선택 (서울)</label>' +
    '<div class="relative">' +
      '<select id="region" name="region" required class="w-full appearance-none bg-none bg-surface-container-lowest border border-outline-variant rounded-lg py-3 pl-4 pr-10 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-travel-orange focus:border-transparent transition-shadow shadow-sm">' +
        '<option value="" disabled selected>원하시는 자치구를 선택해주세요</option>' +
        REGIONS.map(function (r) { return '<option value="' + r + '">' + r + '</option>'; }).join("") +
      '</select>' +
      '<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">' +
        '<span class="material-symbols-outlined">expand_more</span>' +
      '</div>' +
    '</div>';
  $("region").addEventListener("change", updateSubmitState);
}

function renderCategoryGrid() {
  var grid = $("categoryGrid");
  grid.innerHTML = CATEGORIES.map(function (c, i) {
    return (
      '<label class="cursor-pointer">' +
        '<input class="peer sr-only" type="radio" name="category" value="' + c.value + '" id="cat-' + i + '">' +
        '<div class="flex flex-col items-center justify-center p-md rounded-xl border border-outline-variant bg-surface-container-lowest peer-checked:bg-primary-container peer-checked:border-travel-orange peer-checked:text-on-primary-container hover:bg-surface-container-low transition-all shadow-sm active:scale-95">' +
          '<span class="material-symbols-outlined text-4xl mb-sm" style="font-variation-settings: \'FILL\' 1;">' + c.icon + '</span>' +
          '<span class="font-label-md text-label-md">' + c.value + '</span>' +
        '</div>' +
      '</label>'
    );
  }).join("");
  grid.addEventListener("change", updateSubmitState);
}

function updateSubmitState() {
  var region = $("region").value;
  var category = document.querySelector('input[name="category"]:checked');
  $("submitBtn").disabled = !(region && category);
}

function categoryIcon(name) {
  var found = CATEGORIES.filter(function (c) { return c.value === name; })[0];
  return found ? found.icon : "restaurant";
}

function goToResults(region, category) {
  state.region = region;
  state.category = category;
  state.pageNo = 1;
  state.items = [];
  state.hasMore = false;

  $("screen-search").hidden = true;
  $("screen-results").hidden = false;
  $("headerLeftIcon").textContent = "arrow_back";
  $("resultTitle").textContent = region + " > " + category + " 검색 결과";
  renderChips();
  runSearch();
}

function goToSearch() {
  $("screen-search").hidden = false;
  $("screen-results").hidden = true;
  $("headerLeftIcon").textContent = "directions_bus";
}

function renderChips() {
  var row = $("chipRow");
  row.innerHTML = CATEGORIES.map(function (c) {
    var cls = c.value === state.category
      ? "px-4 py-1 bg-travel-orange text-on-primary rounded-full font-label-md text-label-md whitespace-nowrap shadow-sm"
      : "px-4 py-1 bg-surface-container-highest text-on-surface-variant rounded-full font-label-md text-label-md whitespace-nowrap hover:bg-travel-orange hover:text-on-primary transition-colors cursor-pointer";
    return '<button type="button" class="' + cls + '" data-cat="' + c.value + '">' + c.value + '</button>';
  }).join("");
  row.querySelectorAll("button").forEach(function (chip) {
    chip.addEventListener("click", function () {
      goToResults(state.region, chip.dataset.cat);
    });
  });
}

function renderLoading() {
  $("resultBody").innerHTML =
    '<p class="font-label-md text-label-md text-on-surface-variant text-center mb-md">' +
      '처음 조회하는 조건은 원본 데이터가 느려서 최대 40초 정도 걸릴 수 있어요. 한 번 불러오면 다음부턴 바로 나와요.' +
    '</p>' +
    '<div class="flex flex-col gap-md">' +
      '<div class="skeleton h-40 rounded-xl"></div>' +
      '<div class="skeleton h-40 rounded-xl"></div>' +
      '<div class="skeleton h-40 rounded-xl"></div>' +
    '</div>';
}

function renderError() {
  $("resultTitle").textContent = state.region + " > " + state.category + " 검색 결과";
  $("resultBody").innerHTML =
    '<div class="mt-xl flex flex-col items-center justify-center p-xl bg-error-container rounded-xl text-center shadow-sm">' +
      '<span class="material-symbols-outlined text-[48px] text-error mb-sm">error</span>' +
      '<h3 class="font-headline-md text-headline-md text-on-error-container mb-2">오류가 발생했어요</h3>' +
      '<p class="font-body-md text-body-md text-on-error-container mb-md">일시적인 오류가 발생했습니다. 다시 시도해주세요</p>' +
      '<button id="retryBtn" type="button" class="px-6 py-2 rounded-full bg-error text-on-error font-label-md text-label-md">다시 시도</button>' +
    '</div>';
  $("retryBtn").addEventListener("click", function () { runSearch(); });
}

function renderEmpty() {
  $("resultTitle").textContent = state.region + " > " + state.category + " 검색 결과 0건";
  $("resultBody").innerHTML =
    '<div class="mt-xl flex flex-col items-center justify-center p-xl bg-surface-container-low rounded-xl text-center shadow-sm">' +
      '<span class="material-symbols-outlined text-[48px] text-outline mb-sm">search_off</span>' +
      '<h3 class="font-headline-md text-headline-md text-on-surface mb-2">검색 결과 없음</h3>' +
      '<p class="font-body-md text-body-md text-on-surface-variant">이 지역엔 등록된 시티투어 주변 맛집 정보가 없어요.<br>다른 지역을 선택해보세요</p>' +
    '</div>';
}

function renderList() {
  // totalCount를 신뢰할 수 없어(server.js 주석 참고) 정확한 총 건수 대신
  // 지금까지 불러온 개수를 표시한다.
  $("resultTitle").textContent = state.region + " > " + state.category + " 검색 결과 " +
    state.items.length + (state.hasMore ? "건+" : "건");

  var cardsHtml = state.items.map(function (r, i) {
    var name = r.rstrNm + (r.rstrBhfNm ? " " + r.rstrBhfNm : "");
    var addr = r.rstrRoadAddr || r.rstrLnbrAddr || "";
    // 원본 데이터엔 네이버/카카오 내부 장소 ID나 좌표가 없어(server.js 참고),
    // 정확한 딥링크 대신 "식당명 + 주소"로 지도 검색을 여는 링크를 쓴다.
    var mapQuery = encodeURIComponent(name + (addr ? " " + addr : ""));
    var naverMapUrl = "https://map.naver.com/v5/search/" + mapQuery;
    var kakaoMapUrl = "https://map.kakao.com/?q=" + mapQuery;
    return (
      '<article class="bg-surface-container-lowest rounded-xl shadow-lg overflow-hidden flex flex-col hover:bg-surface-container-low transition-colors cursor-pointer group" data-idx="' + i + '">' +
        '<div class="h-40 w-full relative bg-category-bg flex items-center justify-center">' +
          '<span class="material-symbols-outlined text-[64px] text-travel-orange" style="font-variation-settings: \'FILL\' 1;">' + categoryIcon(r.rstrClNm) + '</span>' +
          '<div class="absolute top-sm right-sm bg-surface-container-lowest/90 px-2 py-1 rounded font-label-sm text-label-sm text-on-surface">' + r.rstrClNm + '</div>' +
        '</div>' +
        '<div class="p-md flex flex-col gap-xs">' +
          '<div class="flex items-center gap-2 mb-1">' +
            '<span class="bg-badge-tour text-bus-blue font-label-sm text-label-sm px-2 py-1 rounded-full flex items-center gap-1">' +
              '<span class="material-symbols-outlined text-[14px]">directions_bus</span> ' + r.title + ' 주변' +
            '</span>' +
          '</div>' +
          '<h3 class="font-headline-md text-headline-md text-on-surface group-hover:text-travel-orange transition-colors">' + name + '</h3>' +
          '<p class="font-body-md text-body-md text-on-surface-variant flex items-start gap-1">' +
            '<span class="material-symbols-outlined text-[18px] mt-[3px]">location_on</span> ' + addr +
          '</p>' +
          '<p class="font-label-sm text-label-sm text-outline text-right mt-1">정보 기준일 ' + r.rstrInfoStdDt + '</p>' +
          '<div class="hidden mt-sm pt-sm border-t border-outline-variant flex flex-col gap-xs" data-map-links>' +
            '<a href="' + naverMapUrl + '" target="_blank" rel="noopener noreferrer" data-map-link class="flex items-center gap-1 text-primary font-label-md text-label-md hover:underline">' +
              '<span class="material-symbols-outlined text-[18px]">map</span> 네이버 지도에서 보기' +
            '</a>' +
            '<a href="' + kakaoMapUrl + '" target="_blank" rel="noopener noreferrer" data-map-link class="flex items-center gap-1 text-primary font-label-md text-label-md hover:underline">' +
              '<span class="material-symbols-outlined text-[18px]">location_on</span> 카카오 지도에서 보기' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }).join("");

  var loadMoreHtml = state.hasMore
    ? '<button id="loadMoreBtn" type="button" class="w-full py-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-primary font-label-md text-label-md">더보기</button>'
    : '';

  $("resultBody").innerHTML = '<div class="flex flex-col gap-md">' + cardsHtml + '</div>' +
    (loadMoreHtml ? '<div class="mt-md">' + loadMoreHtml + '</div>' : '');

  var loadMoreBtn = $("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMore);
  }
}

function toggleMapLinks(card) {
  var panel = card.querySelector("[data-map-links]");
  if (panel) panel.classList.toggle("hidden");
}

function runSearch() {
  renderLoading();
  state.pageNo = 1;
  fetchRestaurants(state.region, state.category, state.pageNo).then(function (data) {
    state.items = data.items;
    state.hasMore = data.items.length === PAGE_SIZE;
    if (state.items.length === 0) {
      renderEmpty();
    } else {
      renderList();
    }
  }).catch(function (err) {
    console.error(err);
    renderError();
  });
}

function loadMore() {
  var nextPage = state.pageNo + 1;
  fetchRestaurants(state.region, state.category, nextPage).then(function (data) {
    state.pageNo = nextPage;
    state.items = state.items.concat(data.items);
    state.hasMore = data.items.length === PAGE_SIZE;
    renderList();
  }).catch(function (err) {
    console.error(err);
    renderError();
  });
}

renderRegionField();
renderCategoryGrid();

$("searchForm").addEventListener("submit", function (e) {
  e.preventDefault();
  var region = $("region").value;
  var category = document.querySelector('input[name="category"]:checked');
  if (!region || !category) return;
  goToResults(region, category.value);
});

// 카드는 renderList()/loadMore()가 매번 innerHTML로 통째로 다시 그리므로 카드마다
// 개별 리스너를 다는 대신, 절대 다시 그려지지 않는 #resultBody 자체에 한 번만
// 이벤트 위임 리스너를 걸어 클릭된 카드를 event.target.closest(...)로 찾는다.
$("resultBody").addEventListener("click", function (e) {
  var link = e.target.closest("a[data-map-link]");
  if (link) {
    // 지도 링크 클릭은 새 탭에서 정상적으로 열리게 두고, 카드 토글로는 번지지 않게 한다.
    e.stopPropagation();
    return;
  }
  var card = e.target.closest("article[data-idx]");
  if (!card) return;
  toggleMapLinks(card);
});

$("backBtn").addEventListener("click", goToSearch);
$("headerLeftBtn").addEventListener("click", function () {
  if (!$("screen-results").hidden) goToSearch();
});

// 칩이 화면 밖으로 잘려서 overflow-x-auto만으로는 마우스로 못 미는 문제 →
// 마우스 드래그로도 가로 스크롤할 수 있게 한다. #chipRow 엘리먼트 자체는
// renderChips()가 다시 그려도 유지되므로(innerHTML만 교체) 한 번만 등록하면 된다.
(function enableDragScroll() {
  var el = $("chipRow");
  var isDown = false;
  var startX = 0;
  var startScrollLeft = 0;
  var moved = false;

  el.addEventListener("mousedown", function (e) {
    isDown = true;
    moved = false;
    startX = e.pageX;
    startScrollLeft = el.scrollLeft;
  });

  window.addEventListener("mousemove", function (e) {
    if (!isDown) return;
    var delta = e.pageX - startX;
    if (Math.abs(delta) > 3) moved = true;
    el.scrollLeft = startScrollLeft - delta;
  });

  window.addEventListener("mouseup", function () {
    isDown = false;
  });

  // 드래그 도중 살짝 움직인 것까지 칩 클릭(카테고리 재검색)으로 처리되지 않도록 막는다.
  el.addEventListener(
    "click",
    function (e) {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true
  );
})();
