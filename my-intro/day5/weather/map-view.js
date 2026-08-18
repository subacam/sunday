// d3-geo + topojson-client 기반 SVG 세계지도: 팬/줌, 마커, 대륙 자동 줌 (PRD F-01)
window.WW = window.WW || {};

(function () {
  "use strict";

  const VIEW_W = 960;
  const VIEW_H = 500;
  const WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const SVG_NS = "http://www.w3.org/2000/svg";

  let svg, viewportG, countriesG, markersG, tooltipEl;
  let projection = null;
  let pathGen = null;
  let transform = { tx: 0, ty: 0, scale: 1 };
  let dragging = false;
  let dragMoved = false;
  let dragStart = null;
  const DRAG_THRESHOLD_PX = 5;
  const markerEls = new Map(); // id -> { g, dot, emoji, badge }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function setTransformImmediate(tx, ty, scale) {
    transform = { tx, ty, scale: clamp(scale, ZOOM_MIN, ZOOM_MAX) };
    viewportG.setAttribute(
      "transform",
      `translate(${transform.tx},${transform.ty}) scale(${transform.scale})`
    );
  }

  function tweenTransform(target, durationMs) {
    const start = { ...transform };
    const startTime = performance.now();
    function step(now) {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setTransformImmediate(
        start.tx + (target.tx - start.tx) * eased,
        start.ty + (target.ty - start.ty) * eased,
        start.scale + (target.scale - start.scale) * eased
      );
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function buildDom(containerEl) {
    containerEl.innerHTML = "";

    svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${VIEW_W} ${VIEW_H}`);
    svg.setAttribute("id", "world-map");
    svg.setAttribute("aria-label", "세계 지도, 랜드마크를 선택하면 날씨를 볼 수 있습니다");
    svg.setAttribute("tabindex", "0");
    containerEl.appendChild(svg);

    viewportG = document.createElementNS(SVG_NS, "g");
    viewportG.setAttribute("id", "map-viewport");
    svg.appendChild(viewportG);

    countriesG = document.createElementNS(SVG_NS, "g");
    countriesG.setAttribute("id", "map-countries");
    viewportG.appendChild(countriesG);

    markersG = document.createElementNS(SVG_NS, "g");
    markersG.setAttribute("id", "map-markers");
    viewportG.appendChild(markersG);

    tooltipEl = document.getElementById("map-tooltip");
  }

  // svg에 setPointerCapture가 걸린 뒤에는 pointerup의 e.target이 캡처한 svg 자신으로
  // 재지정되어(스펙상 정상 동작) 실제로 어떤 요소 위에서 손을 뗐는지 알 수 없다.
  // 화면 좌표 기준으로 실제 렌더된 요소를 다시 조회해야 마커/국가 판별이 정확하다.
  function hitTestAt(clientX, clientY) {
    return document.elementFromPoint(clientX, clientY);
  }

  // 마커가 아닌 지도(국가 영역/바다) 클릭 시, 클릭한 좌표를 검색 결과 선택과 동일하게 취급한다.
  function handleMapClick(e, hitEl) {
    if (!projection) return;

    const targetEl = hitEl || hitTestAt(e.clientX, e.clientY);
    const countryPath = targetEl && targetEl.closest && targetEl.closest(".map-country");
    const countryName = countryPath ? countryPath.getAttribute("data-country-name") : null;

    // <svg viewBox> 기본값(preserveAspectRatio: xMidYMid meet)은 컨테이너 비율이 달라도
    // 종횡비를 유지한 채 가운데 정렬되므로, 레터박스 여백을 감안해 화면 좌표 -> viewBox 좌표로 변환한다.
    const rect = svg.getBoundingClientRect();
    const fitScale = Math.min(rect.width / VIEW_W, rect.height / VIEW_H);
    const offsetX = (rect.width - VIEW_W * fitScale) / 2;
    const offsetY = (rect.height - VIEW_H * fitScale) / 2;
    const svgX = (e.clientX - rect.left - offsetX) / fitScale;
    const svgY = (e.clientY - rect.top - offsetY) / fitScale;

    // 팬/줌(map-viewport의 transform) 역변환으로 투영 좌표계(raw projection space)로 되돌린다.
    const worldX = (svgX - transform.tx) / transform.scale;
    const worldY = (svgY - transform.ty) / transform.scale;

    const lonLat = projection.invert([worldX, worldY]);
    if (!lonLat || Number.isNaN(lonLat[0]) || Number.isNaN(lonLat[1])) return;
    const [lon, lat] = lonLat;

    window.WW.actions.selectAdHoc({
      lat,
      lon,
      label: countryName || `위도 ${lat.toFixed(1)}, 경도 ${lon.toFixed(1)}`,
      admin1: "",
      country: countryName || "",
    });
  }

  function attachInteractions() {
    svg.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.3 : 0.3;
        setTransformImmediate(transform.tx, transform.ty, transform.scale + delta);
      },
      { passive: false }
    );

    svg.addEventListener("pointerdown", (e) => {
      dragging = true;
      dragMoved = false;
      dragStart = { x: e.clientX, y: e.clientY, tx: transform.tx, ty: transform.ty };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) dragMoved = true;
      setTransformImmediate(dragStart.tx + dx, dragStart.ty + dy, transform.scale);
    });
    svg.addEventListener("pointerup", (e) => {
      dragging = false;
      if (dragMoved) return; // 드래그(팬)였다면 클릭으로 취급하지 않음
      // setPointerCapture 이후 e.target은 캡처한 svg로 재지정되므로 믿을 수 없다.
      // 실제 화면 좌표에서 무엇이 렌더되어 있는지 다시 조회해서 마커 여부를 판별한다.
      const hitEl = hitTestAt(e.clientX, e.clientY);
      const markerEl = hitEl && hitEl.closest && hitEl.closest(".marker");
      if (markerEl) {
        window.WW.actions.selectLandmark(markerEl.getAttribute("data-id"));
      } else {
        handleMapClick(e, hitEl);
      }
    });
    svg.addEventListener("pointercancel", () => {
      dragging = false;
    });

    svg.addEventListener("dblclick", (e) => {
      e.preventDefault();
      setTransformImmediate(transform.tx, transform.ty, clamp(transform.scale * 2, ZOOM_MIN, ZOOM_MAX));
    });

    // 지도 컨테이너 자체에 포커스가 있을 때만 방향키 팬 (검색창 등과 충돌 방지)
    svg.addEventListener("keydown", (e) => {
      if (e.target !== svg) return;
      const step = 30;
      if (e.key === "ArrowUp") setTransformImmediate(transform.tx, transform.ty + step, transform.scale);
      else if (e.key === "ArrowDown") setTransformImmediate(transform.tx, transform.ty - step, transform.scale);
      else if (e.key === "ArrowLeft") setTransformImmediate(transform.tx + step, transform.ty, transform.scale);
      else if (e.key === "ArrowRight") setTransformImmediate(transform.tx - step, transform.ty, transform.scale);
      else return;
      e.preventDefault();
    });

    const zoomInBtn = document.getElementById("map-zoom-in");
    const zoomOutBtn = document.getElementById("map-zoom-out");
    const resetBtn = document.getElementById("map-reset");
    if (zoomInBtn)
      zoomInBtn.addEventListener("click", () =>
        setTransformImmediate(transform.tx, transform.ty, transform.scale + 0.5)
      );
    if (zoomOutBtn)
      zoomOutBtn.addEventListener("click", () =>
        setTransformImmediate(transform.tx, transform.ty, transform.scale - 0.5)
      );
    if (resetBtn) resetBtn.addEventListener("click", () => tweenTransform({ tx: 0, ty: 0, scale: 1 }, 300));
  }

  function renderCountries(countries) {
    countriesG.innerHTML = "";
    countries.features.forEach((feature) => {
      const path = document.createElementNS(SVG_NS, "path");
      const d = pathGen(feature);
      if (!d) return;
      path.setAttribute("d", d);
      path.setAttribute("class", "map-country");
      const countryName = feature.properties && feature.properties.name;
      if (countryName) path.setAttribute("data-country-name", countryName);
      countriesG.appendChild(path);
    });
  }

  function renderMarkers() {
    markersG.innerHTML = "";
    markerEls.clear();

    // Tab 순회가 대륙→랜드마크 순서를 따르도록 landmarks.js가 이미 정렬해 둔 순서 그대로 사용
    window.WW.landmarks.forEach((landmark) => {
      const [x, y] = projection([landmark.longitude, landmark.latitude]);

      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("class", "marker marker--neutral");
      g.setAttribute("data-id", landmark.id);
      g.setAttribute("transform", `translate(${x},${y})`);
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", `${landmark.name}, ${landmark.city}, ${landmark.country}`);

      const pulse = document.createElementNS(SVG_NS, "circle");
      pulse.setAttribute("class", "marker-pulse");
      pulse.setAttribute("r", "10");
      g.appendChild(pulse);

      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("class", "marker-dot");
      dot.setAttribute("r", "5");
      g.appendChild(dot);

      const emoji = document.createElementNS(SVG_NS, "text");
      emoji.setAttribute("class", "marker-emoji");
      emoji.setAttribute("y", "-10");
      emoji.setAttribute("text-anchor", "middle");
      emoji.textContent = landmark.emoji;
      g.appendChild(emoji);

      const badge = document.createElementNS(SVG_NS, "text");
      badge.setAttribute("class", "marker-badge");
      badge.setAttribute("y", "20");
      badge.setAttribute("text-anchor", "middle");
      g.appendChild(badge);

      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.WW.actions.selectLandmark(landmark.id);
        }
      });
      g.addEventListener("pointerenter", () => showTooltip(landmark, g));
      g.addEventListener("focus", () => showTooltip(landmark, g));
      g.addEventListener("pointerleave", hideTooltip);
      g.addEventListener("blur", hideTooltip);

      markersG.appendChild(g);
      markerEls.set(landmark.id, { g, dot, emoji, badge });
    });
  }

  function showTooltip(landmark, markerEl) {
    if (!tooltipEl) return;
    const entry = window.WW.state.markerWeather.get(landmark.id);
    const tempText =
      entry && entry.status === "ok"
        ? window.WW.units.formatTemperature(entry.data.temperature, window.WW.state.units.temp)
        : "";
    tooltipEl.textContent = tempText ? `${landmark.name} · ${landmark.city} · ${tempText}` : `${landmark.name} · ${landmark.city}`;
    const rect = markerEl.getBoundingClientRect();
    const parent = tooltipEl.offsetParent;
    const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };
    tooltipEl.style.left = `${rect.left - parentRect.left + rect.width / 2}px`;
    tooltipEl.style.top = `${rect.top - parentRect.top}px`;
    tooltipEl.hidden = false;
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.hidden = true;
  }

  function updateMarkerWeather() {
    window.WW.state.markerWeather.forEach((entry, id) => {
      const refs = markerEls.get(id);
      if (!refs) return;
      refs.g.classList.remove("marker--neutral");
      if (entry.status === "ok") {
        refs.g.classList.remove("marker--failed");
        refs.badge.textContent = window.WW.units.formatTemperature(
          entry.data.temperature,
          window.WW.state.units.temp
        );
        refs.emoji.textContent = entry.data.icon;
      } else {
        refs.g.classList.add("marker--failed");
        refs.badge.textContent = "정보 없음";
      }
    });
  }

  function updateSelectionVisual(payload) {
    const selectedId = payload ? payload.id : null;
    markerEls.forEach((refs, id) => {
      refs.g.classList.toggle("marker--selected", id === selectedId);
    });
  }

  function zoomToContinent(continent) {
    const bounds = window.WW.continentBounds[continent];
    if (!bounds || !projection) return;
    const corners = [
      [bounds.lonMin, bounds.latMin],
      [bounds.lonMax, bounds.latMin],
      [bounds.lonMin, bounds.latMax],
      [bounds.lonMax, bounds.latMax],
    ].map((c) => projection(c));
    const xs = corners.map((p) => p[0]);
    const ys = corners.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const boxW = Math.max(maxX - minX, 1);
    const boxH = Math.max(maxY - minY, 1);
    const padding = 40;
    const scale = clamp(
      Math.min((VIEW_W - padding * 2) / boxW, (VIEW_H - padding * 2) / boxH),
      ZOOM_MIN,
      ZOOM_MAX
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    tweenTransform({ tx: VIEW_W / 2 - cx * scale, ty: VIEW_H / 2 - cy * scale, scale }, 600);
  }

  function updateFilterVisual(activeContinents) {
    markerEls.forEach((refs, id) => {
      const landmark = window.WW.getLandmarkById(id);
      const match = activeContinents.length === 0 || activeContinents.includes(landmark.continent);
      refs.g.classList.toggle("marker--dimmed", !match);
    });

    if (!projection) return;
    if (activeContinents.length === 1) {
      zoomToContinent(activeContinents[0]);
    } else {
      tweenTransform({ tx: 0, ty: 0, scale: 1 }, 600);
    }
  }

  function resetView() {
    tweenTransform({ tx: 0, ty: 0, scale: 1 }, 300);
  }

  function init(containerEl) {
    buildDom(containerEl);
    attachInteractions();

    fetch(WORLD_ATLAS_URL)
      .then((res) => res.json())
      .then((topo) => {
        const countries = topojson.feature(topo, topo.objects.countries);
        projection = d3.geoNaturalEarth1().fitSize([VIEW_W, VIEW_H], countries);
        pathGen = d3.geoPath(projection);
        renderCountries(countries);
        renderMarkers();
        updateMarkerWeather();
        updateFilterVisual(Array.from(window.WW.state.activeContinents));
        updateSelectionVisual({ id: window.WW.state.selectedId });
        window.WW.bus.emit("map:ready");
      })
      .catch(() => {
        // 지도 데이터 로드 실패해도 나머지 UI(리스트뷰 등)는 계속 동작해야 하므로
        // 전체 화면 에러로 확대하지 않고 지도 영역에만 실패를 알린다.
        window.WW.bus.emit("map:loadError");
      });

    window.WW.bus.on("weather:updated", updateMarkerWeather);
    window.WW.bus.on("units:changed", updateMarkerWeather);
    window.WW.bus.on("selection:changed", updateSelectionVisual);
    window.WW.bus.on("filter:changed", updateFilterVisual);
  }

  window.WW.mapView = { init, resetView };
})();
