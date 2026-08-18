// 부트스트랩 + 상세 패널 렌더 + 헤더 컨트롤 + 에러 상태 배선 (app 전체 glue)
window.WW = window.WW || {};

(function () {
  "use strict";

  const ERROR_MESSAGES = {
    offline: { message: "인터넷 연결을 확인해 주세요", action: "retry" },
    timeout: { message: "날씨 정보를 불러오지 못했어요", action: "retry" },
    network: { message: "날씨 정보를 불러오지 못했어요", action: "retry" },
    "server-error": { message: "날씨 서버에 문제가 있어요. 잠시 후 다시 시도해 주세요", action: "retry" },
    "rate-limited": { message: "요청이 많아요. 잠시 후 다시 시도해 주세요", action: "retry" },
    "bad-request": { message: "위치 정보를 처리할 수 없어요", action: "home" },
    "invalid-landmark": { message: "존재하지 않는 랜드마크예요", action: "home" },
    runtime: { message: "예기치 못한 문제가 발생했어요", action: "reload" },
  };

  let bootLoadingEl, bootErrorEl, bootErrorMessageEl, bootErrorCodeEl, bootErrorRetryBtn, bootErrorHomeBtn;
  let appShellEl, detailPanelEl, detailContentEl, mapLoadErrorEl;
  let currentErrorKind = null;
  let detailClockTimer = null;

  // ── 전체화면 에러 (§10, E-01~E-05·E-08·E-10) ─────────────
  function hideBootError() {
    bootErrorEl.hidden = true;
    currentErrorKind = null;
  }

  function showFullscreenError(kind, opts) {
    opts = opts || {};
    const def = ERROR_MESSAGES[kind] || ERROR_MESSAGES.network;
    currentErrorKind = kind;
    bootErrorMessageEl.textContent = def.message;
    bootErrorCodeEl.textContent = kind;
    bootLoadingEl.hidden = true;
    bootErrorEl.hidden = false;

    bootErrorRetryBtn.hidden = def.action === "home";
    bootErrorHomeBtn.hidden = def.action !== "home";
    bootErrorRetryBtn.textContent = def.action === "reload" ? "새로고침" : "다시 시도";

    bootErrorRetryBtn.onclick = () => {
      hideBootError();
      if (def.action === "reload") {
        window.location.reload();
        return;
      }
      (opts.onRetry || loadApp)();
    };
    bootErrorHomeBtn.onclick = () => {
      hideBootError();
      if (opts.onHome) opts.onHome();
      else {
        window.WW.actions.clearSelection();
        showAppShell();
      }
    };

    // E-04: 429는 60초 후 자동 재시도 (§10)
    if (kind === "rate-limited") {
      setTimeout(() => {
        if (currentErrorKind === "rate-limited" && !bootErrorEl.hidden) bootErrorRetryBtn.onclick();
      }, 60000);
    }
  }

  // ── 로딩/셸 표시 ────────────────────────────────────────
  function showBootLoading() {
    bootLoadingEl.hidden = false;
  }
  function hideBootLoading() {
    bootLoadingEl.hidden = true;
  }
  function showAppShell() {
    appShellEl.hidden = false;
  }

  // ── 헤더 컨트롤(뷰 전환/단위 토글/배경 효과 토글) ──────────
  function windLabel(unit) {
    return unit === "kmh" ? "km/h" : unit === "ms" ? "m/s" : "mph";
  }

  function initHeaderControls() {
    const tempBtn = document.getElementById("units-toggle-temp");
    const windBtn = document.getElementById("units-toggle-wind");
    const bgToggleBtn = document.getElementById("bg-effects-toggle");
    const mapBtn = document.getElementById("view-toggle-map");
    const listBtn = document.getElementById("view-toggle-list");
    const mapSection = document.getElementById("map-section");
    const listSection = document.getElementById("list-section");

    tempBtn.textContent = `°${window.WW.state.units.temp}`;
    windBtn.textContent = windLabel(window.WW.state.units.wind);

    tempBtn.addEventListener("click", () => {
      const next = window.WW.state.units.temp === "C" ? "F" : "C";
      window.WW.actions.setUnits({ ...window.WW.state.units, temp: next });
    });
    windBtn.addEventListener("click", () => {
      const order = ["kmh", "ms", "mph"];
      const next = order[(order.indexOf(window.WW.state.units.wind) + 1) % order.length];
      window.WW.actions.setUnits({ ...window.WW.state.units, wind: next });
    });

    bgToggleBtn.setAttribute("aria-pressed", window.WW.state.bgEffectsOff ? "true" : "false");
    bgToggleBtn.textContent = window.WW.state.bgEffectsOff ? "배경 효과 켜기" : "배경 효과 끄기";
    bgToggleBtn.addEventListener("click", () => {
      const next = !window.WW.state.bgEffectsOff;
      window.WW.actions.setBgEffectsOff(next);
      bgToggleBtn.setAttribute("aria-pressed", next ? "true" : "false");
      bgToggleBtn.textContent = next ? "배경 효과 켜기" : "배경 효과 끄기";
    });

    function setView(view) {
      window.WW.actions.setView(view);
      mapBtn.setAttribute("aria-pressed", view === "map" ? "true" : "false");
      listBtn.setAttribute("aria-pressed", view === "list" ? "true" : "false");
      mapSection.hidden = view !== "map";
      listSection.hidden = view !== "list";
    }
    mapBtn.addEventListener("click", () => setView("map"));
    listBtn.addEventListener("click", () => setView("list"));

    window.WW.bus.on("units:changed", (units) => {
      tempBtn.textContent = `°${units.temp}`;
      windBtn.textContent = windLabel(units.wind);
      if (window.WW.state.selectedDetail) renderDetailContent(window.WW.state.selectedDetail);
    });

    window.WW.bus.on("map:loadError", () => {
      if (mapLoadErrorEl) mapLoadErrorEl.hidden = false;
    });
  }

  // ── 상세 패널 ───────────────────────────────────────────
  function openDetailPanel() {
    detailPanelEl.hidden = false;
    requestAnimationFrame(() => detailPanelEl.classList.add("is-open"));
  }
  function closeDetailPanel() {
    detailPanelEl.classList.remove("is-open");
    stopDetailClockTick();
    setTimeout(() => {
      if (!detailPanelEl.classList.contains("is-open")) detailPanelEl.hidden = true;
    }, 300);
  }

  function renderDetailLoading() {
    detailContentEl.innerHTML = `
      <div class="skeleton" style="height:60px;width:70%"></div>
      <div class="skeleton" style="height:90px;"></div>
      <div class="skeleton" style="height:160px;"></div>
    `;
  }

  function formatIsoTime(iso) {
    return iso ? iso.slice(11, 16) : "--:--";
  }

  function stopDetailClockTick() {
    if (detailClockTimer) {
      clearInterval(detailClockTimer);
      detailClockTimer = null;
    }
  }

  function startDetailClockTick(utcOffsetSeconds) {
    stopDetailClockTick();
    detailClockTimer = setInterval(() => {
      const el = document.getElementById("detail-clock");
      if (!el) {
        stopDetailClockTick();
        return;
      }
      el.textContent = window.WW.daytime.formatLocalClock(utcOffsetSeconds).time;
    }, 1000);
  }

  function renderHourly(detail) {
    const hourlyEl = document.getElementById("detail-hourly");
    if (!hourlyEl || !detail.hourly) return;
    const d = new Date(Date.now() + detail.utcOffsetSeconds * 1000);
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const nowKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate()
    ).padStart(2, "0")}T${hh}:00`;
    let startIdx = detail.hourly.time.findIndex((t) => t >= nowKey);
    if (startIdx === -1) startIdx = 0;
    const slice = detail.hourly.time.slice(startIdx, startIdx + 24);
    hourlyEl.innerHTML = slice
      .map((t, i) => {
        const idx = startIdx + i;
        const info = window.WW.wmo.describeWeatherCode(detail.hourly.weather_code[idx], 1);
        const temp = window.WW.units.formatTemperature(detail.hourly.temperature_2m[idx], window.WW.state.units.temp);
        return `<div class="detail-hourly__item"><div>${t.slice(11, 16)}</div><div>${info.icon}</div><div>${temp}</div></div>`;
      })
      .join("");
  }

  function renderDaily(detail) {
    const dailyEl = document.getElementById("detail-daily");
    if (!dailyEl || !detail.daily) return;
    dailyEl.innerHTML = detail.daily.time
      .map((t, i) => {
        const info = window.WW.wmo.describeWeatherCode(detail.daily.weather_code[i], 1);
        const max = window.WW.units.formatTemperature(detail.daily.temperature_2m_max[i], window.WW.state.units.temp);
        const min = window.WW.units.formatTemperature(detail.daily.temperature_2m_min[i], window.WW.state.units.temp);
        return `<div class="detail-daily__row"><span>${t.slice(5).replace("-", ".")}</span><span>${info.icon}</span><span>${max} / ${min}</span></div>`;
      })
      .join("");
  }

  function renderDetailContent(detail) {
    const landmark = detail.landmarkId ? window.WW.getLandmarkById(detail.landmarkId) : null;
    const adHoc = window.WW.state.selectedAdHoc;
    const name = landmark ? landmark.name : adHoc ? adHoc.label : "";
    const place = landmark
      ? `${landmark.city} · ${landmark.country}`
      : adHoc
      ? [adHoc.admin1, adHoc.country].filter(Boolean).join(" · ")
      : "";
    const emoji = landmark ? landmark.emoji : "📍";
    const units = window.WW.state.units;
    const tempText = window.WW.units.formatTemperature(detail.temperature, units.temp);
    const feelsText = window.WW.units.formatTemperature(detail.apparentTemperature, units.temp);
    const windText = window.WW.units.formatWindSpeed(detail.windSpeed, units.wind);
    const clock = window.WW.daytime.formatLocalClock(detail.utcOffsetSeconds);

    const photoHtml = landmark
      ? `<div class="photo-frame photo-frame--detail" style="background-image:url('${landmark.image}')">
          <img
            class="photo-frame__img"
            src="${landmark.image}"
            alt="${landmark.name}"
            data-fallback-emoji="${landmark.emoji}"
            data-fallback-class="detail-title__emoji"
            onerror="window.WW.filtersList.handleThumbError(this)"
          />
        </div>`
      : `<div class="photo-frame photo-frame--detail"><div class="detail-title__emoji">${emoji}</div></div>`;

    detailContentEl.innerHTML = `
      <div class="detail-title">
        ${photoHtml}
        <p class="detail-title__name">${name}</p>
        <p class="detail-title__place">${place}</p>
      </div>
      <div>
        <div class="detail-clock" id="detail-clock">${clock.time}</div>
        <div class="detail-date">${clock.dateLabel} ${clock.weekdayLabel} · ${detail.isDay ? "낮" : "밤"}</div>
      </div>
      <div class="detail-stats">
        <div class="detail-stat"><div class="detail-stat__label">날씨</div><div class="detail-stat__value">${detail.icon} ${detail.weatherLabel}</div></div>
        <div class="detail-stat"><div class="detail-stat__label">기온</div><div class="detail-stat__value">${tempText}</div></div>
        <div class="detail-stat"><div class="detail-stat__label">체감온도</div><div class="detail-stat__value">${feelsText}</div></div>
        <div class="detail-stat"><div class="detail-stat__label">습도</div><div class="detail-stat__value">${detail.humidity}%</div></div>
        <div class="detail-stat"><div class="detail-stat__label">풍속</div><div class="detail-stat__value">${windText}</div></div>
        <div class="detail-stat"><div class="detail-stat__label">강수</div><div class="detail-stat__value">${detail.precipitation ?? 0} mm</div></div>
      </div>
      <div>
        <p style="font-weight:600;margin:0 0 8px;">시간별 예보</p>
        <div class="detail-hourly" id="detail-hourly"></div>
      </div>
      <div>
        <p style="font-weight:600;margin:0 0 8px;">일별 예보</p>
        <div class="detail-daily" id="detail-daily"></div>
      </div>
      <p class="detail-attribution">
        일출 ${formatIsoTime(detail.sunrise)} · 일몰 ${formatIsoTime(detail.sunset)}<br />
        Weather data by <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a>
      </p>
    `;

    renderHourly(detail);
    renderDaily(detail);
    startDetailClockTick(detail.utcOffsetSeconds);
  }

  function handleSelectionChanged(payload) {
    if (!payload || (!payload.id && !payload.adHoc)) {
      closeDetailPanel();
      return;
    }

    let lat, lon, landmarkId;
    if (payload.id) {
      const landmark = window.WW.getLandmarkById(payload.id);
      if (!landmark) {
        showFullscreenError("invalid-landmark", {
          onHome: () => {
            window.WW.actions.clearSelection();
            showAppShell();
          },
        });
        return;
      }
      lat = landmark.latitude;
      lon = landmark.longitude;
      landmarkId = landmark.id;
    } else {
      lat = payload.adHoc.lat;
      lon = payload.adHoc.lon;
      landmarkId = undefined;
    }

    openDetailPanel();
    renderDetailLoading();
    window.WW.actions.setDetailLoading(true);

    window.WW.weatherApi
      .fetchLandmarkDetail(lat, lon, landmarkId)
      .then((detail) => {
        window.WW.actions.setDetail(detail);
      })
      .catch((err) => {
        if (err && err.kind === "cancelled") return; // 더 최신 선택으로 대체됨
        window.WW.actions.setDetailError(err);
        showFullscreenError(err ? err.kind : "network", {
          onRetry: () => handleSelectionChanged(payload),
        });
      });
  }

  function initDetailPanelWiring() {
    document.getElementById("detail-close").addEventListener("click", () => {
      window.WW.actions.clearSelection();
    });
    window.WW.bus.on("selection:changed", handleSelectionChanged);
    window.WW.bus.on("detail:updated", renderDetailContent);
  }

  // ── 초기 진입 로딩 (F-07 ①) ─────────────────────────────
  function loadApp() {
    showBootLoading();
    hideBootError();
    const startedAt = Date.now();
    const urlState = window.WW.actions.parseUrlState();
    window.WW.actions.setContinentsFromUrl(urlState.continents);

    window.WW.weatherApi.fetchBatchCurrent(window.WW.landmarks).then((result) => {
      window.WW.actions.setMarkerWeatherBulk(result);

      const entries = Array.from(result.values());
      const allFailed = entries.length > 0 && entries.every((v) => v.status === "failed");
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, 400 - elapsed); // F-07: 최소 표시 시간 400ms

      setTimeout(() => {
        if (allFailed) {
          const firstErr = entries[0] && entries[0].error;
          showFullscreenError(firstErr ? firstErr.kind : "network", { onRetry: loadApp });
          return;
        }

        hideBootLoading();
        showAppShell();
        window.WW.actions.setBootLoading(false);

        if (urlState.landmarkId) {
          window.WW.actions.selectLandmark(urlState.landmarkId);
        }
      }, remaining);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bootLoadingEl = document.getElementById("boot-loading");
    bootErrorEl = document.getElementById("boot-error");
    bootErrorMessageEl = document.getElementById("boot-error-message");
    bootErrorCodeEl = document.getElementById("boot-error-code");
    bootErrorRetryBtn = document.getElementById("boot-error-retry");
    bootErrorHomeBtn = document.getElementById("boot-error-home");
    appShellEl = document.getElementById("app-shell");
    detailPanelEl = document.getElementById("detail-panel");
    detailContentEl = document.getElementById("detail-content");
    mapLoadErrorEl = document.getElementById("map-load-error");

    window.addEventListener("online", () => {
      if (!bootErrorEl.hidden && currentErrorKind === "offline") {
        bootErrorRetryBtn.onclick();
      }
    });
    window.addEventListener("error", () => showFullscreenError("runtime", {}));
    window.addEventListener("unhandledrejection", () => showFullscreenError("runtime", {}));

    window.WW.background.init();
    window.WW.mapView.init(document.getElementById("map-container"));
    window.WW.search.init();
    window.WW.filtersList.init();
    initHeaderControls();
    initDetailPanelWiring();

    loadApp();
  });
})();
