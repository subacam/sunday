// 동적 배경: 그라디언트 크로스페이드 + 구름/안개 + 파티클 canvas + 번개 (PRD §9)
window.WW = window.WW || {};

(function () {
  "use strict";

  const FADE_MS = 400;
  const MAX_FLASH_OPACITY = 0.35;

  let gradA, gradB, activeGrad;
  let cloud1, cloud2, fog1, fog2, lightningEl;
  let canvas, ctx;

  let particles = [];
  let targetCount = 0;
  let currentParams = null;
  let windSpeedKmh = 0;
  let windDirectionDeg = 0;

  let dpr = 1;
  let running = false;
  let rafId = null;
  let lastFrameTime = 0;
  let fpsHistory = [];
  let fpsBelowSince = null;
  let hasDegradedOnce = false;
  let perfStopped = false;
  let batterySaver = false;

  let lightningTimer = null;
  let flashHistory = [];
  let currentWeatherCode = 0;

  let lastDetail = null;

  const reducedMotionMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ── 시간대×날씨 → 배경 테마 매트릭스 (§9.2) ────────────────
  function familyOf(weatherGroup) {
    if (weatherGroup === "clear" || weatherGroup === "mostly-clear") return "clear";
    if (weatherGroup === "partly-cloudy" || weatherGroup === "overcast") return "cloudy";
    if (weatherGroup === "fog") return "fog";
    if (
      weatherGroup === "drizzle" ||
      weatherGroup === "freezing-drizzle" ||
      weatherGroup === "rain" ||
      weatherGroup === "freezing-rain" ||
      weatherGroup === "rain-showers"
    )
      return "rain";
    if (weatherGroup === "snow" || weatherGroup === "snow-showers") return "snow";
    if (weatherGroup === "thunderstorm" || weatherGroup === "thunderstorm-hail") return "thunderstorm";
    return "cloudy";
  }

  function pickTheme(timeBucket, weatherGroup) {
    const family = familyOf(weatherGroup);

    if (timeBucket === "day") {
      switch (family) {
        case "clear":
          return { bgKey: "day-clear", clouds: false, fog: false, particle: null, lightning: false };
        case "cloudy":
          return { bgKey: "day-cloudy", clouds: true, fog: false, particle: null, lightning: false };
        case "fog":
          return { bgKey: "day-fog", clouds: false, fog: true, particle: null, lightning: false };
        case "rain":
          return { bgKey: "day-rain", clouds: true, fog: false, particle: "rain", lightning: false };
        case "snow":
          return { bgKey: "day-snow", clouds: true, fog: false, particle: "snow", lightning: false };
        default:
          return { bgKey: "day-thunderstorm", clouds: true, fog: false, particle: "rain", lightning: true };
      }
    }

    if (timeBucket === "dawn" || timeBucket === "dusk") {
      const prefix = timeBucket;
      if (family === "clear") {
        return { bgKey: `${prefix}-clear`, clouds: false, fog: false, particle: null, lightning: false };
      }
      if (family === "fog") {
        return { bgKey: `${prefix}-precip`, clouds: false, fog: true, particle: null, lightning: false };
      }
      if (family === "rain") {
        return { bgKey: `${prefix}-precip`, clouds: true, fog: false, particle: "rain", lightning: false };
      }
      if (family === "snow") {
        return { bgKey: `${prefix}-precip`, clouds: true, fog: false, particle: "snow", lightning: false };
      }
      if (family === "thunderstorm") {
        return { bgKey: `${prefix}-precip`, clouds: true, fog: false, particle: "rain", lightning: true };
      }
      return { bgKey: `${prefix}-precip`, clouds: true, fog: false, particle: null, lightning: false };
    }

    // night
    switch (family) {
      case "clear":
        return { bgKey: "night-clear", clouds: false, fog: false, particle: null, lightning: false };
      case "cloudy":
        return { bgKey: "night-cloudy", clouds: true, fog: false, particle: null, lightning: false };
      case "fog":
        return { bgKey: "night-cloudy", clouds: false, fog: true, particle: null, lightning: false };
      case "rain":
        return { bgKey: "night-precip", clouds: true, fog: false, particle: "rain", lightning: false };
      case "snow":
        return { bgKey: "night-precip", clouds: true, fog: false, particle: "snow", lightning: false };
      default:
        return { bgKey: "night-thunderstorm", clouds: true, fog: false, particle: "rain", lightning: true };
    }
  }

  // ── §9.4 파티클 파라미터 ────────────────────────────────
  function paramsForWeather(weatherCode, weatherGroup) {
    switch (weatherGroup) {
      case "drizzle":
      case "freezing-drizzle":
        return { count: 120, speed: [1.5, 2.5], angleBase: 5, angleRange: 4, shape: "line", size: [8, 12], opacity: 0.35 };
      case "rain":
      case "freezing-rain": {
        const count = weatherCode === 65 || weatherCode === 67 ? 500 : weatherCode === 63 ? 350 : 200;
        return { count, speed: [4, 7], angleBase: 10, angleRange: 8, shape: "line", size: [8, 20], opacity: 0.55 };
      }
      case "rain-showers":
        return { count: 400, speed: [5, 8], angleBase: 15, angleRange: 5, shape: "line", size: [10, 18], opacity: 0.6 };
      case "snow":
      case "snow-showers": {
        const count = weatherCode === 75 || weatherCode === 86 ? 350 : weatherCode === 73 ? 250 : 150;
        return { count, speed: [0.6, 1.4], angleBase: 0, angleRange: 0, shape: "circle", size: [2, 4], opacity: 0.85, sway: true };
      }
      case "thunderstorm":
      case "thunderstorm-hail":
        return { count: 500, speed: [6, 9], angleBase: 20, angleRange: 6, shape: "line", size: [10, 22], opacity: 0.6 };
      default:
        return null; // clear / cloudy / fog: canvas 파티클 없음
    }
  }

  function shouldRunEffects() {
    return (
      !reducedMotionMQ.matches &&
      !window.WW.state.bgEffectsOff &&
      !batterySaver &&
      !perfStopped &&
      !document.hidden
    );
  }

  // ── 파티클 풀/렌더 ──────────────────────────────────────
  function isMobile() {
    return window.innerWidth < 768;
  }

  function effectiveCount(baseCount) {
    return Math.round(baseCount * (isMobile() ? 0.5 : 1));
  }

  function spawnParticle() {
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      speedFactor: 0.6 + Math.random() * 0.8,
      size: 0,
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 0.6 + Math.random() * 0.8,
    };
  }

  function ensurePool(params) {
    const needed = effectiveCount(params.count);
    particles = new Array(needed).fill(null).map(() => {
      const p = spawnParticle();
      p.size = params.size[0] + Math.random() * (params.size[1] - params.size[0]);
      p.speedFactor = params.speed[0] + Math.random() * (params.speed[1] - params.speed[0]);
      return p;
    });
    targetCount = needed;
    hasDegradedOnce = false;
  }

  function resizeCanvas() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startLoop() {
    if (running) return;
    running = true;
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(drawFrame);
  }

  function stopLoop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function updateFps(dt) {
    const fps = dt > 0 ? 1 / dt : 60;
    fpsHistory.push(fps);
    if (fpsHistory.length > 90) fpsHistory.shift();
    const avg = fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length;
    const now = performance.now();
    if (avg < 45) {
      if (fpsBelowSince === null) fpsBelowSince = now;
      if (now - fpsBelowSince > 3000) {
        if (!hasDegradedOnce) {
          targetCount = Math.round(targetCount * 0.5);
          hasDegradedOnce = true;
          fpsBelowSince = now;
        } else {
          perfStopped = true;
          canvas.classList.remove("is-visible");
          stopLoop();
        }
      }
    } else {
      fpsBelowSince = null;
    }
  }

  function drawFrame(now) {
    if (!running) return;
    const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    updateFps(dt);

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (currentParams) {
      drawParticles(dt);
    }

    rafId = requestAnimationFrame(drawFrame);
  }

  function drawParticles(dt) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const p = currentParams;
    const windFactor = Math.max(0, Math.min(1, windSpeedKmh / 30));
    const angleDeg = p.angleBase + windFactor * p.angleRange;
    const angleRad = (angleDeg * Math.PI) / 180;
    // §9.4 단순화: 풍향은 좌/우 드리프트 부호로만 반영 (0~180°=오른쪽, 180~360°=왼쪽)
    const dirSign = windDirectionDeg >= 0 && windDirectionDeg < 180 ? 1 : -1;

    ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
    ctx.strokeStyle = `rgba(255,255,255,${p.opacity})`;
    ctx.lineWidth = 1.4;

    const activeN = Math.min(particles.length, targetCount);
    const fallScale = p.shape === "circle" ? 26 : 55;

    for (let i = 0; i < activeN; i++) {
      const particle = particles[i];
      const vy = particle.speedFactor * fallScale;
      particle.y += vy * dt;

      let dx = Math.sin(angleRad) * vy * dirSign * dt;
      if (p.sway) {
        particle.swayOffset += particle.swaySpeed * dt;
        dx += Math.sin(particle.swayOffset) * 18 * dt;
      }
      particle.x += dx;

      if (particle.y > h + 20) {
        particle.y = -20;
        particle.x = Math.random() * w;
      }
      if (particle.x > w + 20) particle.x = -20;
      if (particle.x < -20) particle.x = w + 20;

      if (p.shape === "line") {
        const len = particle.size;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - Math.sin(angleRad) * len * dirSign, particle.y - Math.cos(angleRad) * len);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function setParticleWeather(particleType, weatherCode, weatherGroup, windSpeed, windDirection) {
    windSpeedKmh = windSpeed || 0;
    windDirectionDeg = windDirection || 0;
    currentWeatherCode = weatherCode || 0;

    const nextParams = particleType && shouldRunEffects() ? paramsForWeather(weatherCode, weatherGroup) : null;

    // 겹침 금지(§F-03): 기존 파티클을 먼저 페이드아웃한 뒤에만 새 타입으로 교체
    canvas.classList.remove("is-visible");
    setTimeout(() => {
      currentParams = nextParams;
      if (nextParams) {
        ensurePool(nextParams);
        if (shouldRunEffects()) {
          canvas.classList.add("is-visible");
          startLoop();
        }
      } else {
        stopLoop();
      }
    }, FADE_MS);
  }

  // ── 번개 (§9.4 안전 규칙) ───────────────────────────────
  function clearLightningTimer() {
    if (lightningTimer) {
      clearTimeout(lightningTimer);
      lightningTimer = null;
    }
  }

  function animateFlash() {
    if (!lightningEl || !lightningEl.animate) {
      if (lightningEl) lightningEl.style.opacity = "0";
      return;
    }
    lightningEl.animate([{ opacity: 0 }, { opacity: MAX_FLASH_OPACITY, offset: 60 / 180 }, { opacity: 0 }], {
      duration: 180,
      easing: "linear",
    });
  }

  function fireFlash() {
    const now = performance.now();
    flashHistory = flashHistory.filter((t) => now - t < 1000);
    if (flashHistory.length >= 3) return; // 초당 3회 초과 금지 (WCAG 2.3.1)
    flashHistory.push(now);
    animateFlash();

    if (Math.random() < 0.3) {
      setTimeout(() => {
        const now2 = performance.now();
        flashHistory = flashHistory.filter((t) => now2 - t < 1000);
        if (flashHistory.length < 3) {
          flashHistory.push(now2);
          animateFlash();
        }
      }, 200);
    }
  }

  function scheduleLightning(weatherCode) {
    clearLightningTimer();
    if (!shouldRunEffects()) return;
    const severe = weatherCode === 96 || weatherCode === 99;
    const min = severe ? 5000 : 8000;
    const max = severe ? 12000 : 20000;
    const delay = min + Math.random() * (max - min);
    lightningTimer = setTimeout(() => {
      fireFlash();
      scheduleLightning(weatherCode);
    }, delay);
  }

  // ── 레이어 적용 ─────────────────────────────────────────
  function applyGradient(bgKey) {
    const incoming = activeGrad === gradA ? gradB : gradA;
    incoming.setAttribute("data-bg", bgKey);
    incoming.classList.add("bg-gradient--active");
    if (activeGrad) activeGrad.classList.remove("bg-gradient--active");
    activeGrad = incoming;
  }

  function applyClouds(show) {
    cloud1.classList.toggle("is-visible", show);
    cloud2.classList.toggle("is-visible", show);
  }

  function applyFog(show) {
    fog1.classList.toggle("is-visible", show);
    fog2.classList.toggle("is-visible", show);
  }

  function applyTheme(theme, weatherCode, weatherGroup, windSpeed, windDirection) {
    applyGradient(theme.bgKey);
    applyClouds(theme.clouds);
    applyFog(theme.fog);
    setParticleWeather(theme.particle, weatherCode, weatherGroup, windSpeed, windDirection);

    if (theme.lightning) {
      scheduleLightning(weatherCode);
    } else {
      clearLightningTimer();
      if (lightningEl) lightningEl.style.opacity = "0";
    }
  }

  function applyForDetail(detail) {
    const timeBucket = window.WW.daytime.computeTimeBucket(detail.utcOffsetSeconds, detail.sunrise, detail.sunset);
    const theme = pickTheme(timeBucket, detail.weatherGroup);
    applyTheme(theme, detail.weatherCode, detail.weatherGroup, detail.windSpeed, detail.windDirection);
  }

  // 선택 전 기본 배경: 브라우저 로컬 시각 기준 대략적인 시간대 + 맑음으로 근사 (§4)
  function applyDefaultBackground() {
    const hour = new Date().getHours();
    let timeBucket = "day";
    if (hour >= 5 && hour < 7) timeBucket = "dawn";
    else if (hour >= 7 && hour < 18) timeBucket = "day";
    else if (hour >= 18 && hour < 20) timeBucket = "dusk";
    else timeBucket = "night";
    applyTheme(pickTheme(timeBucket, "clear"), 0, "clear", 0, 0);
  }

  function reapplyLast() {
    if (lastDetail) applyForDetail(lastDetail);
    else applyDefaultBackground();
  }

  function handleDetailUpdated(detail) {
    lastDetail = detail;
    applyForDetail(detail);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      stopLoop();
      clearLightningTimer();
    } else {
      if (currentParams && shouldRunEffects()) startLoop();
      if (lastDetail) {
        const timeBucket = window.WW.daytime.computeTimeBucket(
          lastDetail.utcOffsetSeconds,
          lastDetail.sunrise,
          lastDetail.sunset
        );
        const theme = pickTheme(timeBucket, lastDetail.weatherGroup);
        if (theme.lightning) scheduleLightning(lastDetail.weatherCode);
      }
    }
  }

  function detectBatterySaver() {
    if (navigator.getBattery) {
      navigator
        .getBattery()
        .then((battery) => {
          batterySaver = battery.level < 0.2 && !battery.charging;
          if (batterySaver) reapplyLast();
        })
        .catch(() => {
          /* 미지원 브라우저는 조용히 건너뜀 (best-effort) */
        });
    }
  }

  function init() {
    gradA = document.getElementById("bg-gradient-a");
    gradB = document.getElementById("bg-gradient-b");
    activeGrad = gradA;
    cloud1 = document.querySelector(".cloud-layer--1");
    cloud2 = document.querySelector(".cloud-layer--2");
    fog1 = document.getElementById("bg-fog-1");
    fog2 = document.getElementById("bg-fog-2");
    lightningEl = document.getElementById("bg-lightning");
    canvas = document.getElementById("bg-particles");
    ctx = canvas.getContext("2d");

    resizeCanvas();
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeCanvas();
        if (currentParams) ensurePool(currentParams);
      }, 200);
    });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    reducedMotionMQ.addEventListener("change", reapplyLast);
    window.WW.bus.on("bgEffects:changed", reapplyLast);
    window.WW.bus.on("detail:updated", handleDetailUpdated);

    detectBatterySaver();
    applyDefaultBackground();

    // §9.1 시간대는 분 단위 경계이므로 60초마다 재평가
    setInterval(() => {
      if (lastDetail) applyForDetail(lastDetail);
    }, 60000);
  }

  window.WW.background = { init };
})();
