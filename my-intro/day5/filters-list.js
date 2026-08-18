// 대륙 필터 칩 바 + 리스트/그리드 뷰 + 정렬 (PRD F-05, F-06)
window.WW = window.WW || {};

(function () {
  "use strict";

  let filterBarEl, listGridEl, listEmptyEl, listEmptyResetEl, sortSelectEl;
  let tickTimer = null;

  function renderChips() {
    filterBarEl.innerHTML = "";
    window.WW.continentOrder.forEach((continent) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = window.WW.continentLabels[continent];
      chip.setAttribute("aria-pressed", window.WW.state.activeContinents.has(continent) ? "true" : "false");
      chip.addEventListener("click", () => window.WW.actions.toggleContinent(continent));
      filterBarEl.appendChild(chip);
    });
    const clearChip = document.createElement("button");
    clearChip.type = "button";
    clearChip.className = "chip chip--clear";
    clearChip.textContent = "전체 해제";
    clearChip.addEventListener("click", () => window.WW.actions.clearContinents());
    filterBarEl.appendChild(clearChip);
  }

  function updateChips() {
    const chips = filterBarEl.querySelectorAll(".chip:not(.chip--clear)");
    window.WW.continentOrder.forEach((continent, i) => {
      if (chips[i]) chips[i].setAttribute("aria-pressed", window.WW.state.activeContinents.has(continent) ? "true" : "false");
    });
  }

  function filteredLandmarks() {
    const active = Array.from(window.WW.state.activeContinents);
    if (active.length === 0) return window.WW.landmarks.slice();
    return window.WW.landmarks.filter((l) => active.includes(l.continent));
  }

  function sortLandmarks(list) {
    const sort = window.WW.state.sort;
    const paired = list.map((l) => ({ l, w: window.WW.state.markerWeather.get(l.id) }));
    if (sort === "temp-desc" || sort === "temp-asc") {
      paired.sort((a, b) => {
        const at = a.w && a.w.status === "ok" ? a.w.data.temperature : -Infinity;
        const bt = b.w && b.w.status === "ok" ? b.w.data.temperature : -Infinity;
        return sort === "temp-desc" ? bt - at : at - bt;
      });
    } else if (sort === "local-time") {
      paired.sort((a, b) => {
        const ao = a.w && a.w.status === "ok" ? a.w.data.utcOffsetSeconds : 0;
        const bo = b.w && b.w.status === "ok" ? b.w.data.utcOffsetSeconds : 0;
        return bo - ao;
      });
    } else {
      paired.sort((a, b) => a.l.name.localeCompare(b.l.name, "ko"));
    }
    return paired.map((x) => x.l);
  }

  function cardBodyHtml(landmark, entry) {
    const head = `
      <div class="landmark-card__emoji">${landmark.emoji}</div>
      <div class="landmark-card__name">${landmark.name}</div>
      <div class="landmark-card__place">${landmark.city} · ${landmark.country}</div>`;

    if (!entry || entry.status === "loading") {
      return `${head}<div class="skeleton" style="height:20px;width:60%"></div>`;
    }
    if (entry.status === "failed") {
      return `${head}
        <div class="landmark-card__row"><span>정보를 불러오지 못했어요</span></div>
        <button type="button" class="btn retry-btn" data-retry-id="${landmark.id}">다시 시도</button>`;
    }
    const tempText = window.WW.units.formatTemperature(entry.data.temperature, window.WW.state.units.temp);
    const clock = window.WW.daytime.formatLocalClock(entry.data.utcOffsetSeconds).time;
    return `${head}
      <div class="landmark-card__row">
        <span class="landmark-card__temp">${tempText}</span>
        <span>${entry.data.icon}</span>
      </div>
      <div class="landmark-card__row">
        <span class="landmark-card__clock" data-clock-id="${landmark.id}">${clock}</span>
        <span class="landmark-card__badge">${entry.data.isDay ? "낮" : "밤"}</span>
      </div>`;
  }

  function buildCard(landmark, entry) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "landmark-card";
    card.dataset.id = landmark.id;
    if (entry && entry.status === "failed") card.classList.add("landmark-card--failed");
    if (window.WW.state.selectedId === landmark.id) card.classList.add("is-selected");
    card.innerHTML = cardBodyHtml(landmark, entry);
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-retry-id]")) return;
      window.WW.actions.selectLandmark(landmark.id);
    });
    return card;
  }

  function renderList() {
    if (!listGridEl) return;
    const filtered = filteredLandmarks();
    if (filtered.length === 0) {
      listGridEl.innerHTML = "";
      listEmptyEl.hidden = false;
      return;
    }
    listEmptyEl.hidden = true;
    const sorted = sortLandmarks(filtered);
    listGridEl.innerHTML = "";
    sorted.forEach((landmark) => {
      const entry = window.WW.state.markerWeather.get(landmark.id);
      listGridEl.appendChild(buildCard(landmark, entry));
    });
  }

  function retryMarker(id) {
    const landmark = window.WW.getLandmarkById(id);
    if (!landmark) return;
    window.WW.actions.setMarkerWeather(id, { status: "loading" });
    window.WW.weatherApi.fetchBatchCurrent([landmark]).then((result) => {
      window.WW.actions.setMarkerWeatherBulk(result);
    });
  }

  function isListVisible() {
    return window.WW.state.view === "list";
  }

  function startTick() {
    if (tickTimer) return;
    tickTimer = setInterval(() => {
      document.querySelectorAll("[data-clock-id]").forEach((el) => {
        const id = el.getAttribute("data-clock-id");
        const entry = window.WW.state.markerWeather.get(id);
        if (entry && entry.status === "ok") {
          el.textContent = window.WW.daytime.formatLocalClock(entry.data.utcOffsetSeconds).time;
        }
      });
    }, 1000);
  }

  function stopTick() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function init() {
    filterBarEl = document.getElementById("filter-bar");
    listGridEl = document.getElementById("list-grid");
    listEmptyEl = document.getElementById("list-empty");
    listEmptyResetEl = document.getElementById("list-empty-reset");
    sortSelectEl = document.getElementById("sort-select");

    renderChips();
    sortSelectEl.value = window.WW.state.sort;

    sortSelectEl.addEventListener("change", () => window.WW.actions.setSort(sortSelectEl.value));
    listEmptyResetEl.addEventListener("click", () => window.WW.actions.clearContinents());
    listGridEl.addEventListener("click", (e) => {
      const retryBtn = e.target.closest("[data-retry-id]");
      if (retryBtn) {
        e.stopPropagation();
        retryMarker(retryBtn.getAttribute("data-retry-id"));
      }
    });

    window.WW.bus.on("filter:changed", () => {
      updateChips();
      if (isListVisible()) renderList();
    });
    window.WW.bus.on("weather:updated", () => {
      if (isListVisible()) renderList();
    });
    window.WW.bus.on("sort:changed", () => {
      if (isListVisible()) renderList();
    });
    window.WW.bus.on("units:changed", () => {
      if (isListVisible()) renderList();
    });
    window.WW.bus.on("selection:changed", (payload) => {
      if (!listGridEl) return;
      listGridEl.querySelectorAll(".landmark-card").forEach((card) => {
        card.classList.toggle("is-selected", payload && card.dataset.id === payload.id);
      });
    });
    window.WW.bus.on("view:changed", (view) => {
      if (view === "list") {
        renderList();
        startTick();
      } else {
        stopTick();
      }
    });
  }

  window.WW.filtersList = { init, renderList };
})();
