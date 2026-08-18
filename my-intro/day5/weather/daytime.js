// 일출·일몰 기준 시간대 계산(§9.1) + 현지 시각 표시(F-02)
window.WW = window.WW || {};

(function () {
  "use strict";

  const MINUTE_MS = 60 * 1000;
  const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

  // Open-Meteo의 sunrise/sunset(§7.1)은 timezone=auto 적용 시 오프셋 없는 로컬
  // 벽시계 문자열("2026-08-18T05:32")로 온다. 이를 UTC로 강제 파싱하면, 실제 UTC
  // 시각에 utc_offset_seconds를 더한 값과 같은 "shifted epoch" 공간에 놓이게 되어
  // Date.now() + utcOffsetSeconds*1000 와 직접 숫자 비교가 가능해진다.
  function toShiftedEpoch(isoLocalNaive) {
    const withZone = /Z|[+-]\d\d:\d\d$/.test(isoLocalNaive)
      ? isoLocalNaive
      : `${isoLocalNaive}Z`;
    return Date.parse(withZone);
  }

  function getShiftedNow(utcOffsetSeconds, nowMs) {
    const base = typeof nowMs === "number" ? nowMs : Date.now();
    return base + utcOffsetSeconds * 1000;
  }

  /**
   * §9.1 시간대 구분: 일출 −60분~+30분(dawn), 일출+30분~일몰−60분(day),
   * 일몰−60분~+30분(dusk), 그 외(night)
   * @returns {'dawn'|'day'|'dusk'|'night'}
   */
  function computeTimeBucket(utcOffsetSeconds, sunriseIso, sunsetIso, nowMs) {
    const now = getShiftedNow(utcOffsetSeconds, nowMs);
    const sunrise = toShiftedEpoch(sunriseIso);
    const sunset = toShiftedEpoch(sunsetIso);

    const dawnStart = sunrise - 60 * MINUTE_MS;
    const dawnEnd = sunrise + 30 * MINUTE_MS;
    const duskStart = sunset - 60 * MINUTE_MS;
    const duskEnd = sunset + 30 * MINUTE_MS;

    if (now >= dawnStart && now < dawnEnd) return "dawn";
    if (now >= dawnEnd && now < duskStart) return "day";
    if (now >= duskStart && now < duskEnd) return "dusk";
    return "night";
  }

  /**
   * 현지 시각을 HH:mm:ss + 날짜/요일로 포맷 (F-02, ±2초 이내 정확도 요구)
   */
  function formatLocalClock(utcOffsetSeconds, nowMs) {
    const shifted = getShiftedNow(utcOffsetSeconds, nowMs);
    const d = new Date(shifted);
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const mm = String(d.getUTCMinutes()).padStart(2, "0");
    const ss = String(d.getUTCSeconds()).padStart(2, "0");
    const dateLabel = `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(
      d.getUTCDate()
    ).padStart(2, "0")}`;
    const weekdayLabel = `${WEEKDAYS_KO[d.getUTCDay()]}요일`;
    return { hh, mm, ss, time: `${hh}:${mm}:${ss}`, dateLabel, weekdayLabel };
  }

  window.WW.daytime = {
    computeTimeBucket,
    formatLocalClock,
  };
})();
