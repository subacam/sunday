// 도시 검색: 디바운스 300ms, 2자 미만 요청 안 함, 키보드 내비, abort (PRD F-04)
window.WW = window.WW || {};

(function () {
  "use strict";

  const DEBOUNCE_MS = 300;
  const MIN_QUERY_LEN = 2;

  let inputEl, spinnerEl, resultsEl, emptyEl;
  let debounceTimer = null;
  let abortController = null;
  let results = [];
  let activeIndex = -1;

  function clearResults() {
    resultsEl.innerHTML = "";
    resultsEl.hidden = true;
    inputEl.setAttribute("aria-expanded", "false");
    activeIndex = -1;
  }

  function hideEmpty() {
    emptyEl.hidden = true;
  }

  function showEmpty(query) {
    emptyEl.textContent = `'${query}'에 대한 검색 결과가 없습니다. 철자를 확인해 보세요.`;
    emptyEl.hidden = false;
  }

  function formatResultLabel(r) {
    if (r.type === "landmark") {
      return `${r.emoji} ${r.name} · ${r.city} · ${r.country}`;
    }
    const parts = [r.name];
    if (r.admin1) parts.push(r.admin1);
    if (r.country) parts.push(r.country);
    return parts.join(" · ");
  }

  // 지도/리스트뷰의 랜드마크 이름·도시도 검색창에서 함께 찾히도록 로컬 매칭 (도시 검색과 별개)
  function matchLandmarks(query) {
    const trimmed = query.trim();
    const lower = trimmed.toLowerCase();
    return window.WW.landmarks
      .filter(
        (l) => l.name.includes(trimmed) || l.city.includes(trimmed) || l.nameEn.toLowerCase().includes(lower)
      )
      .slice(0, 5)
      .map((l) => ({ type: "landmark", id: l.id, name: l.name, city: l.city, country: l.country, emoji: l.emoji }));
  }

  function renderResults(list) {
    results = list;
    resultsEl.innerHTML = "";
    activeIndex = -1;
    if (list.length === 0) {
      resultsEl.hidden = true;
      inputEl.setAttribute("aria-expanded", "false");
      return;
    }
    list.forEach((r, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.id = `search-result-${i}`;
      li.textContent = formatResultLabel(r);
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectResult(r);
      });
      resultsEl.appendChild(li);
    });
    resultsEl.hidden = false;
    inputEl.setAttribute("aria-expanded", "true");
  }

  function highlight(index) {
    const items = resultsEl.querySelectorAll("li");
    items.forEach((el, i) => el.classList.toggle("is-active", i === index));
    if (index >= 0 && items[index]) {
      inputEl.setAttribute("aria-activedescendant", items[index].id);
      items[index].scrollIntoView({ block: "nearest" });
    } else {
      inputEl.removeAttribute("aria-activedescendant");
    }
  }

  function selectResult(r) {
    if (r.type === "landmark") {
      window.WW.actions.selectLandmark(r.id);
    } else {
      window.WW.actions.selectAdHoc({
        lat: r.lat,
        lon: r.lon,
        label: r.name,
        admin1: r.admin1 || "",
        country: r.country || "",
      });
    }
    inputEl.value = formatResultLabel(r);
    clearResults();
    hideEmpty();
  }

  function runSearch(query) {
    const landmarkMatches = matchLandmarks(query);

    if (abortController) abortController.abort();
    abortController = new AbortController();
    spinnerEl.hidden = false;
    hideEmpty();

    window.WW.weatherApi
      .searchCities(query, { signal: abortController.signal })
      .then((cityList) => {
        spinnerEl.hidden = true;
        const cityMatches = cityList.map((r) => ({
          type: "city",
          lat: r.latitude,
          lon: r.longitude,
          name: r.name,
          admin1: r.admin1 || "",
          country: r.country || "",
        }));
        const combined = landmarkMatches.concat(cityMatches);
        if (combined.length === 0) {
          clearResults();
          showEmpty(query);
        } else {
          renderResults(combined);
        }
      })
      .catch((err) => {
        if (err && err.kind === "cancelled") return;
        spinnerEl.hidden = true;
        // 도시 검색이 실패해도 랜드마크 매치가 있으면 그것만이라도 보여준다
        if (landmarkMatches.length > 0) {
          renderResults(landmarkMatches);
        } else {
          clearResults();
        }
      });
  }

  function handleInput() {
    const query = inputEl.value.trim();
    clearTimeout(debounceTimer);
    hideEmpty();

    if (query.length < MIN_QUERY_LEN) {
      if (abortController) abortController.abort();
      spinnerEl.hidden = true;
      clearResults();
      return;
    }

    debounceTimer = setTimeout(() => runSearch(query), DEBOUNCE_MS);
  }

  function handleKeydown(e) {
    if (resultsEl.hidden) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, results.length - 1);
      highlight(activeIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      highlight(activeIndex);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? results[activeIndex] : results[0];
      if (target) selectResult(target);
    } else if (e.key === "Escape") {
      clearResults();
      hideEmpty();
    }
  }

  function init() {
    inputEl = document.getElementById("search-input");
    spinnerEl = document.getElementById("search-spinner");
    resultsEl = document.getElementById("search-results");
    emptyEl = document.getElementById("search-empty");

    inputEl.addEventListener("input", handleInput);
    inputEl.addEventListener("keydown", handleKeydown);
    inputEl.addEventListener("blur", () => {
      // mousedown(클릭) 시 blur가 먼저 발생해도 selectResult가 처리되도록 약간의 지연 후 닫기
      setTimeout(() => {
        clearResults();
        hideEmpty();
      }, 150);
    });
  }

  window.WW.search = { init };
})();
