// Open-Meteo 연동: 배치 현재 날씨, 상세 예보, 지오코딩 검색 (PRD §7)
window.WW = window.WW || {};

(function () {
  "use strict";

  const FORECAST_BASE = "https://api.open-meteo.com/v1/forecast";
  const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search";

  const WEATHER_TTL_MS = 10 * 60 * 1000;
  const SEARCH_TTL_MS = 5 * 60 * 1000;

  const weatherCache = new Map(); // coordKey -> { data, fetchedAt }
  const searchCache = new Map(); // query -> { data, fetchedAt }

  function coordKey(lat, lon) {
    return `${lat.toFixed(4)},${lon.toFixed(4)}`;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function apiError(kind, status) {
    const err = new Error(`WW API error: ${kind} (${status || "n/a"})`);
    err.isApiError = true;
    err.kind = kind; // 'offline' | 'timeout' | 'server-error' | 'rate-limited' | 'bad-request' | 'network' | 'cancelled'
    err.status = status || 0;
    return err;
  }

  /**
   * 공용 fetch: 10초 타임아웃, 429는 60초 후 1회 재시도, 5xx/네트워크 오류는
   * 1s→2s→4s 지수 백오프로 최대 `retries`회 재시도, 400 계열은 재시도하지 않는다. (§7.3)
   */
  async function fetchWithRetry(url, opts) {
    const { retries = 3, baseDelayMs = 1000, timeoutMs = 10000, signal } = opts || {};
    let attempt = 0;
    let rateLimitedOnce = false;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw apiError("offline", 0);
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const internalController = new AbortController();
      const onExternalAbort = () => internalController.abort();
      if (signal) {
        if (signal.aborted) internalController.abort();
        else signal.addEventListener("abort", onExternalAbort);
      }
      const timeoutId = setTimeout(() => internalController.abort(), timeoutMs);

      try {
        const res = await fetch(url, { signal: internalController.signal });
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener("abort", onExternalAbort);

        if (res.ok) return await res.json();

        if (res.status === 429) {
          if (rateLimitedOnce) throw apiError("rate-limited", res.status);
          rateLimitedOnce = true;
          await delay(60000);
          continue;
        }
        if (res.status >= 500) {
          if (attempt >= retries) throw apiError("server-error", res.status);
          await delay(baseDelayMs * 2 ** attempt);
          attempt += 1;
          continue;
        }
        throw apiError("bad-request", res.status);
      } catch (err) {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener("abort", onExternalAbort);

        if (err.isApiError) throw err;

        if (err.name === "AbortError") {
          if (signal && signal.aborted) throw apiError("cancelled", 0);
          if (attempt >= retries) throw apiError("timeout", 0);
          await delay(baseDelayMs * 2 ** attempt);
          attempt += 1;
          continue;
        }

        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          throw apiError("offline", 0);
        }
        if (attempt >= retries) throw apiError("network", 0);
        await delay(baseDelayMs * 2 ** attempt);
        attempt += 1;
      }
    }
  }

  function toWeatherState(landmarkId, current, utcOffsetSeconds) {
    const info = window.WW.wmo.describeWeatherCode(current.weather_code, current.is_day);
    return {
      landmarkId,
      temperature: current.temperature_2m,
      apparentTemperature: current.apparent_temperature,
      weatherCode: current.weather_code,
      weatherGroup: info.group,
      weatherLabel: info.label,
      icon: info.icon,
      isDay: current.is_day,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      precipitation: current.precipitation,
      utcOffsetSeconds,
      fetchedAt: Date.now(),
    };
  }

  /**
   * 전체 랜드마크 좌표를 콤마 join해 1회 요청으로 현재 날씨만 배치 조회 (§7.1).
   * 반환: Map<landmarkId, { status: 'ok', data } | { status: 'failed' }>
   */
  async function fetchBatchCurrent(landmarks) {
    const lat = landmarks.map((l) => l.latitude).join(",");
    const lon = landmarks.map((l) => l.longitude).join(",");
    const url =
      `${FORECAST_BASE}?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation` +
      `&timezone=auto`;

    const result = new Map();

    let json;
    try {
      json = await fetchWithRetry(url, { retries: 3, timeoutMs: 10000 });
    } catch (err) {
      landmarks.forEach((l) => result.set(l.id, { status: "failed", error: err }));
      return result;
    }

    const entries = Array.isArray(json) ? json : [json];

    landmarks.forEach((landmark, i) => {
      const entry = entries[i];
      if (!entry || !entry.current || entry.error) {
        result.set(landmark.id, { status: "failed" }); // E-09 부분 실패
        return;
      }
      const data = toWeatherState(landmark.id, entry.current, entry.utc_offset_seconds);
      weatherCache.set(coordKey(landmark.latitude, landmark.longitude), {
        data,
        fetchedAt: Date.now(),
      });
      result.set(landmark.id, { status: "ok", data });
    });

    return result;
  }

  let activeDetailController = null;

  /**
   * 선택된 랜드마크/검색결과 1건의 상세(현재+시간별24h+일별7일) 조회.
   * 새 호출 시 이전 요청은 자동 취소된다.
   */
  async function fetchLandmarkDetail(lat, lon, landmarkId) {
    if (activeDetailController) activeDetailController.abort();
    const controller = new AbortController();
    activeDetailController = controller;

    const cacheHit = weatherCache.get(coordKey(lat, lon));
    if (cacheHit && Date.now() - cacheHit.fetchedAt < WEATHER_TTL_MS && cacheHit.data.hourly) {
      return cacheHit.data;
    }

    const url =
      `${FORECAST_BASE}?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,precipitation` +
      `&hourly=temperature_2m,weather_code,precipitation_probability` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
      `&timezone=auto&forecast_days=7`;

    const json = await fetchWithRetry(url, {
      retries: 3,
      timeoutMs: 10000,
      signal: controller.signal,
    });

    const state = toWeatherState(landmarkId, json.current, json.utc_offset_seconds);
    state.sunrise = json.daily.sunrise[0];
    state.sunset = json.daily.sunset[0];
    state.hourly = json.hourly;
    state.daily = json.daily;

    weatherCache.set(coordKey(lat, lon), { data: state, fetchedAt: Date.now() });
    return state;
  }

  /**
   * 도시 검색 (Geocoding API, §7.2). 2자 미만 호출 금지는 호출부(search.js) 책임.
   */
  async function searchCities(query, opts) {
    const key = query.trim().toLowerCase();
    const cached = searchCache.get(key);
    if (cached && Date.now() - cached.fetchedAt < SEARCH_TTL_MS) {
      return cached.data;
    }

    const url = `${GEOCODING_BASE}?name=${encodeURIComponent(query)}&count=8&language=ko&format=json`;
    const json = await fetchWithRetry(url, {
      retries: 2,
      timeoutMs: 10000,
      signal: opts && opts.signal,
    });
    const results = Array.isArray(json.results) ? json.results : [];
    searchCache.set(key, { data: results, fetchedAt: Date.now() });
    return results;
  }

  window.WW.weatherApi = {
    fetchBatchCurrent,
    fetchLandmarkDetail,
    searchCities,
  };
})();
