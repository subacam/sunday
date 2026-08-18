// 중앙 상태 객체 + pub/sub 이벤트 버스 + URL(?l=, ?c=) 동기화
window.WW = window.WW || {};

(function () {
  "use strict";

  const LS_UNITS = "ww:units";
  const LS_BG_EFFECTS_OFF = "ww:bgEffectsOff";

  // ── 이벤트 버스 ─────────────────────────────────────────
  const listeners = {};
  const bus = {
    on(event, handler) {
      (listeners[event] || (listeners[event] = [])).push(handler);
    },
    off(event, handler) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter((h) => h !== handler);
    },
    emit(event, payload) {
      (listeners[event] || []).forEach((h) => h(payload));
    },
  };

  function loadUnits() {
    try {
      const raw = localStorage.getItem(LS_UNITS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* localStorage 접근 불가 시 기본값 사용 */
    }
    return { temp: "C", wind: "kmh" };
  }

  function loadBgEffectsOff() {
    try {
      return localStorage.getItem(LS_BG_EFFECTS_OFF) === "1";
    } catch (e) {
      return false;
    }
  }

  function parseUrlState() {
    const params = new URLSearchParams(window.location.search);
    const l = params.get("l");
    const c = params.get("c");
    return {
      landmarkId: l || null,
      continents: c ? c.split(",").filter(Boolean) : [],
    };
  }

  const state = {
    view: "map", // 'map' | 'list'
    selectedId: null,
    selectedAdHoc: null, // { lat, lon, label, country }
    selectedDetail: null, // WeatherState & { hourly, daily }
    detailLoading: false,
    detailError: null,
    markerWeather: new Map(), // id -> { status: 'loading'|'ok'|'failed', data }
    activeContinents: new Set(),
    sort: "name",
    units: loadUnits(),
    bgEffectsOff: loadBgEffectsOff(),
    bootError: null,
    bootLoading: true,
  };

  function syncUrl() {
    const params = new URLSearchParams();
    if (state.selectedId) params.set("l", state.selectedId);
    if (state.activeContinents.size > 0) {
      params.set("c", Array.from(state.activeContinents).join(","));
    }
    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? `?${qs}` : "");
    window.history.replaceState(null, "", newUrl);
  }

  function selectLandmark(id) {
    state.selectedId = id;
    state.selectedAdHoc = null;
    state.selectedDetail = null;
    state.detailError = null;
    syncUrl();
    bus.emit("selection:changed", { id, adHoc: null });
  }

  function selectAdHoc(loc) {
    state.selectedId = null;
    state.selectedAdHoc = loc;
    state.selectedDetail = null;
    state.detailError = null;
    syncUrl();
    bus.emit("selection:changed", { id: null, adHoc: loc });
  }

  function clearSelection() {
    state.selectedId = null;
    state.selectedAdHoc = null;
    state.selectedDetail = null;
    state.detailError = null;
    syncUrl();
    bus.emit("selection:changed", { id: null, adHoc: null });
  }

  function setDetailLoading(loading) {
    state.detailLoading = loading;
    bus.emit("detail:loading", loading);
  }

  function setDetail(detail) {
    state.selectedDetail = detail;
    state.detailLoading = false;
    state.detailError = null;
    bus.emit("detail:updated", detail);
  }

  function setDetailError(err) {
    state.detailLoading = false;
    state.detailError = err;
    bus.emit("detail:error", err);
  }

  function setMarkerWeatherBulk(map) {
    map.forEach((value, id) => state.markerWeather.set(id, value));
    bus.emit("weather:updated", { bulk: true });
  }

  function setMarkerWeather(id, value) {
    state.markerWeather.set(id, value);
    bus.emit("weather:updated", { id });
  }

  function toggleContinent(continent) {
    if (state.activeContinents.has(continent)) {
      state.activeContinents.delete(continent);
    } else {
      state.activeContinents.add(continent);
    }
    syncUrl();
    bus.emit("filter:changed", Array.from(state.activeContinents));
  }

  function clearContinents() {
    state.activeContinents.clear();
    syncUrl();
    bus.emit("filter:changed", []);
  }

  function setContinentsFromUrl(list) {
    state.activeContinents = new Set(list);
    bus.emit("filter:changed", Array.from(state.activeContinents));
  }

  function setView(view) {
    state.view = view;
    bus.emit("view:changed", view);
  }

  function setSort(sort) {
    state.sort = sort;
    bus.emit("sort:changed", sort);
  }

  function setUnits(units) {
    state.units = units;
    try {
      localStorage.setItem(LS_UNITS, JSON.stringify(units));
    } catch (e) {
      /* 저장 실패는 무시 (예: 프라이빗 모드) */
    }
    bus.emit("units:changed", units);
  }

  function setBgEffectsOff(off) {
    state.bgEffectsOff = off;
    try {
      localStorage.setItem(LS_BG_EFFECTS_OFF, off ? "1" : "0");
    } catch (e) {
      /* 저장 실패는 무시 */
    }
    bus.emit("bgEffects:changed", off);
  }

  function setBootError(err) {
    state.bootError = err;
    state.bootLoading = false;
    bus.emit("boot:error", err);
  }

  function setBootLoading(loading) {
    state.bootLoading = loading;
    bus.emit("boot:loading", loading);
  }

  window.WW.bus = bus;
  window.WW.state = state;
  window.WW.actions = {
    parseUrlState,
    selectLandmark,
    selectAdHoc,
    clearSelection,
    setDetailLoading,
    setDetail,
    setDetailError,
    setMarkerWeatherBulk,
    setMarkerWeather,
    toggleContinent,
    clearContinents,
    setContinentsFromUrl,
    setView,
    setSort,
    setUnits,
    setBgEffectsOff,
    setBootError,
    setBootLoading,
  };
})();
