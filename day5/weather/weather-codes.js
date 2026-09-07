// WMO Weather Code 매핑 (PRD §8) + 단위 변환 헬퍼 (F-09)
window.WW = window.WW || {};

(function () {
  "use strict";

  /**
   * @typedef {'clear'|'mostly-clear'|'partly-cloudy'|'overcast'|'fog'|'drizzle'|
   *   'freezing-drizzle'|'rain'|'freezing-rain'|'snow'|'rain-showers'|'snow-showers'|
   *   'thunderstorm'|'thunderstorm-hail'} WeatherGroup
   */

  // code -> { label, group, iconDay, iconNight }
  const WMO_MAP = {
    0: { label: "맑음", group: "clear", iconDay: "☀️", iconNight: "🌙" },
    1: { label: "대체로 맑음", group: "mostly-clear", iconDay: "🌤", iconNight: "🌤" },
    2: { label: "구름 조금", group: "partly-cloudy", iconDay: "⛅️", iconNight: "⛅️" },
    3: { label: "흐림", group: "overcast", iconDay: "☁️", iconNight: "☁️" },
    45: { label: "안개", group: "fog", iconDay: "🌫", iconNight: "🌫" },
    48: { label: "서리 안개", group: "fog", iconDay: "🌫", iconNight: "🌫" },
    51: { label: "약한 이슬비", group: "drizzle", iconDay: "🌦", iconNight: "🌦" },
    53: { label: "이슬비", group: "drizzle", iconDay: "🌦", iconNight: "🌦" },
    55: { label: "강한 이슬비", group: "drizzle", iconDay: "🌦", iconNight: "🌦" },
    56: { label: "어는 이슬비", group: "freezing-drizzle", iconDay: "🌧❄️", iconNight: "🌧❄️" },
    57: { label: "강한 어는 이슬비", group: "freezing-drizzle", iconDay: "🌧❄️", iconNight: "🌧❄️" },
    61: { label: "약한 비", group: "rain", iconDay: "🌧", iconNight: "🌧" },
    63: { label: "비", group: "rain", iconDay: "🌧", iconNight: "🌧" },
    65: { label: "강한 비", group: "rain", iconDay: "🌧", iconNight: "🌧" },
    66: { label: "어는 비", group: "freezing-rain", iconDay: "🌧❄️", iconNight: "🌧❄️" },
    67: { label: "강한 어는 비", group: "freezing-rain", iconDay: "🌧❄️", iconNight: "🌧❄️" },
    71: { label: "약한 눈", group: "snow", iconDay: "🌨", iconNight: "🌨" },
    73: { label: "눈", group: "snow", iconDay: "🌨", iconNight: "🌨" },
    75: { label: "강한 눈", group: "snow", iconDay: "🌨", iconNight: "🌨" },
    77: { label: "싸락눈", group: "snow", iconDay: "🌨", iconNight: "🌨" },
    80: { label: "약한 소나기", group: "rain-showers", iconDay: "🌦", iconNight: "🌦" },
    81: { label: "소나기", group: "rain-showers", iconDay: "🌦", iconNight: "🌦" },
    82: { label: "강한 소나기", group: "rain-showers", iconDay: "🌦", iconNight: "🌦" },
    85: { label: "약한 소낙눈", group: "snow-showers", iconDay: "🌨", iconNight: "🌨" },
    86: { label: "강한 소낙눈", group: "snow-showers", iconDay: "🌨", iconNight: "🌨" },
    95: { label: "뇌우", group: "thunderstorm", iconDay: "⛈", iconNight: "⛈" },
    96: { label: "우박 동반 뇌우", group: "thunderstorm-hail", iconDay: "⛈", iconNight: "⛈" },
    99: { label: "강한 우박 동반 뇌우", group: "thunderstorm-hail", iconDay: "⛈", iconNight: "⛈" },
  };

  function describeWeatherCode(code, isDay) {
    const entry = WMO_MAP[code] || WMO_MAP[3];
    return {
      code,
      label: entry.label,
      group: entry.group,
      icon: isDay ? entry.iconDay : entry.iconNight,
    };
  }

  // ── 단위 변환 (F-09) ────────────────────────────────────
  // 내부적으로는 항상 API 원 단위(섭씨, km/h)를 상태에 보관하고, 표시 시점에만 변환한다.
  function celsiusToFahrenheit(c) {
    return c * (9 / 5) + 32;
  }

  function kmhToMs(kmh) {
    return kmh / 3.6;
  }

  function kmhToMph(kmh) {
    return kmh / 1.60934;
  }

  function formatTemperature(tempC, unit) {
    const value = unit === "F" ? celsiusToFahrenheit(tempC) : tempC;
    return `${Math.round(value)}°${unit}`;
  }

  function formatWindSpeed(speedKmh, unit) {
    if (unit === "ms") return `${kmhToMs(speedKmh).toFixed(1)} m/s`;
    if (unit === "mph") return `${kmhToMph(speedKmh).toFixed(1)} mph`;
    return `${Math.round(speedKmh)} km/h`;
  }

  window.WW.wmo = {
    describeWeatherCode,
  };
  window.WW.units = {
    celsiusToFahrenheit,
    kmhToMs,
    kmhToMph,
    formatTemperature,
    formatWindSpeed,
  };
})();
