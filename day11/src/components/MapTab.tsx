"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MaplibreMap, Marker, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import mapStyle from "@/lib/mapStyle.json";
import { MOOD_BG, MOOD_COLOR, MOOD_LIST, type Mood } from "@/lib/mood";
import { formatDistance, formatDuration, tracksToGeoJSON } from "@/lib/track";
import type { WalkTracker } from "@/lib/useWalkTracker";
import type { TrackPoint, WalkRecord, WalkTrack } from "@/types/walk";
import PawIcon from "@/components/PawIcon";

// 사용자가 실제로 걸은 곳이 없을 때 보여줄 기본 중심 — 서울시청.
const DEFAULT_CENTER: [number, number] = [126.978, 37.5665];

type PeriodKey = "all" | "7d" | "30d" | "90d" | "custom";

const PERIODS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: "all", label: "전체", days: null },
  { key: "7d", label: "최근 1주", days: 7 },
  { key: "30d", label: "최근 1개월", days: 30 },
  { key: "90d", label: "최근 3개월", days: 90 },
];

// 기록(created_at)과 산책 트랙(started_at) 양쪽에 같은 기간 필터를 적용하려고
// 레코드가 아니라 ISO 문자열을 받는다.
function withinPeriod(iso: string, key: PeriodKey, custom: { start: string; end: string }) {
  if (key === "custom") {
    if (!custom.start || !custom.end) return true;
    const start = new Date(custom.start);
    const end = new Date(custom.end);
    end.setHours(23, 59, 59, 999);
    const date = new Date(iso);
    return date >= start && date <= end;
  }
  const period = PERIODS.find((p) => p.key === key);
  if (!period || period.days == null) return true;
  const diffDays = (Date.now() - new Date(iso).getTime()) / 86400000;
  return diffDays <= period.days;
}

// 걸어온 길을 그리는 점선 레이어. Cat Paw Icon 디자인의 "오늘의 산책" 카드가
// stroke-width 3 · stroke-dasharray "1 9" · round cap으로 점선을 그리는데,
// MapLibre의 dasharray 단위는 픽셀이 아니라 line-width 배수라 그 비율(3px:9px)을
// 그대로 옮기면 [0.33, 3]이 된다. round cap 덕분에 대시가 원형 점으로 찍힌다.
const TRACK_SOURCE = "walk-tracks";
const TRACK_LAYER = "walk-tracks-line";
const ACTIVE_SOURCE = "walk-active-track";
const ACTIVE_LAYER = "walk-active-track-line";
const TRACK_COLOR = "#E8927C";

const DOT_LINE_LAYOUT = { "line-cap": "round", "line-join": "round" } as const;

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function activeTrackGeoJSON(points: TrackPoint[]): GeoJSON.FeatureCollection {
  if (points.length < 2) return emptyFeatureCollection();
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: points.map((p) => [p.lng, p.lat] as [number, number]) },
      },
    ],
  };
}

// 지도 로딩 중 보여줄 발자국 4개 — Claude Design에서 추가된 "발자취를 따라가는
// 중..." 로딩 디자인을 그대로 옮긴 값(색상/오프셋/회전/딜레이).
const LOADING_FEET = [
  { color: "#E8927C", offset: -6, rotate: -8, delay: 0 },
  { color: "#8FAE8C", offset: 4, rotate: 4, delay: 0.14 },
  { color: "#D9A65C", offset: -6, rotate: -6, delay: 0.28 },
  { color: "#B08CC7", offset: 4, rotate: 6, delay: 0.42 },
] as const;

function FootIcon({ color, offset, rotate, delay }: { color: string; offset: number; rotate: number; delay: number }) {
  return (
    <PawIcon
      size={26}
      color={color}
      style={{
        overflow: "visible",
        transform: `translateY(${offset}px) rotate(${rotate}deg)`,
        animation: `wr-foot-step 0.5s ease-out ${delay}s both, wr-foot-pulse 1.6s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}

// 테두리를 무드 단색이 아니라 피드 카드와 같은 MOOD_BG 그라디언트로 채워
// Clay 디자인의 코랄 그라디언트 톤(버튼/아바타/FAB)과 같은 계열로 맞춘다.
// border는 그라디언트를 못 그려서, padding으로 링 두께를 만드는 방식을 쓴다.
// 사진은 여기서 바로 넣지 않는다 — 화면 안에 들어온 핀만 즉시 불러오고, 화면
// 밖 핀은 photoContainer만 만들어둔 채 pendingPinsRef에 넘겨 나중에(드래그로
// 시야에 들어올 때) loadPinPhoto로 채운다.
function pinElement(record: WalkRecord) {
  const el = document.createElement("div");
  el.style.cursor = "pointer";
  el.style.width = "40px";
  el.style.height = "40px";
  el.style.borderRadius = "50%";
  el.style.padding = "3px";
  el.style.background = MOOD_BG[record.ai_mood];
  el.style.boxShadow = "0 2px 6px rgba(46,43,36,0.3)";
  const photoContainer = document.createElement("div");
  photoContainer.style.cssText = "width:100%;height:100%;border-radius:50%;overflow:hidden;background:#fff;";
  el.appendChild(photoContainer);
  return { el, photoContainer };
}

// 진행 중인 산책의 맨 앞(현재 위치)에 찍는 마커 — "오늘의 산책" 카드에서 점선 끝에
// 코랄 원 + 흰 발바닥이 놓이는 그 표시를 그대로 옮긴 것. MapLibre Marker는 React가
// 아니라 DOM 엘리먼트를 요구해서 SVG를 문자열로 넣는다.
function activeHeadElement() {
  const el = document.createElement("div");
  el.style.cssText =
    "width:30px;height:30px;border-radius:50%;background:#E8927C;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(46,43,36,0.25);";
  el.innerHTML = `<svg width="17" height="17" viewBox="0 0 100 100" fill="#fff" aria-hidden="true"><ellipse cx="18" cy="42" rx="10" ry="12.5" transform="rotate(-22 18 42)"/><ellipse cx="38.5" cy="27" rx="10.5" ry="13" transform="rotate(-8 38.5 27)"/><ellipse cx="61.5" cy="27" rx="10.5" ry="13" transform="rotate(8 61.5 27)"/><ellipse cx="82" cy="42" rx="10" ry="12.5" transform="rotate(22 82 42)"/><path d="M50 46C62 46 78 60 82 72C85 82 76 89 66 88C58 87.2 42 87.2 34 88C24 89 15 82 18 72C22 60 38 46 50 46Z"/></svg>`;
  return el;
}

function loadPinPhoto(photoContainer: HTMLDivElement, photoUrl: string, onLoad?: () => void) {
  const img = document.createElement("img");
  img.src = photoUrl;
  img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
  if (onLoad) img.onload = onLoad;
  photoContainer.appendChild(img);
}

// 기간/무드 필터 칩 행을 마우스로 클릭한 채 드래그해서 좌우로 스크롤할 수 있게
// 한다 — 터치 스와이프·트랙패드 휠은 브라우저가 기본으로 처리해주지만, 마우스
// 드래그는 앱이 직접 구현해야 동작한다. 살짝 움직인 정도(4px 이하)는 드래그로
// 치지 않고 칩 클릭이 그대로 통과하게 두고, 그 이상 움직였으면 드래그로 보고
// 뒤이은 클릭(필터 선택)을 막는다.
function useDragScroll(rowRef: React.RefObject<HTMLDivElement | null>) {
  const gestureRef = useRef<{ startX: number; startScrollLeft: number; pointerId: number } | null>(null);
  const draggedRef = useRef(false);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const row = rowRef.current;
    if (!row) return;
    gestureRef.current = { startX: e.clientX, startScrollLeft: row.scrollLeft, pointerId: e.pointerId };
    draggedRef.current = false;
    try {
      row.setPointerCapture(e.pointerId);
    } catch {
      // 캡처 미지원 브라우저 — 없어도 대부분의 경우 정상 동작하므로 무시
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const row = rowRef.current;
    const g = gestureRef.current;
    if (!row || !g || g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    if (Math.abs(dx) > 4) draggedRef.current = true;
    if (draggedRef.current) row.scrollLeft = g.startScrollLeft - dx;
  }

  function endGesture(e: React.PointerEvent<HTMLDivElement>) {
    const row = rowRef.current;
    const g = gestureRef.current;
    if (row && g && g.pointerId === e.pointerId) {
      try {
        row.releasePointerCapture(g.pointerId);
      } catch {
        // 이미 해제됐거나 캡처 미지원 브라우저 — 없어도 대부분의 경우 정상 동작하므로 무시
      }
    }
    gestureRef.current = null;
  }

  function onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
    if (draggedRef.current) {
      e.stopPropagation();
      draggedRef.current = false;
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp: endGesture, onPointerCancel: endGesture, onClickCapture };
}

export default function MapTab({
  records,
  tracks,
  tracker,
  imageUrls,
  onSelectPin,
}: {
  records: WalkRecord[];
  tracks: WalkTrack[];
  tracker: WalkTracker;
  imageUrls: Record<string, string>;
  onSelectPin: (record: WalkRecord) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  // 진행 중인 산책의 현재 위치 마커 — 핀 마커와 달리 하나뿐이라 따로 들고 있는다.
  const activeHeadRef = useRef<Marker | null>(null);
  // 화면 밖이라 아직 사진을 안 불러온 핀들 — moveend 때마다 현재 시야와 대조한다.
  const pendingPinsRef = useRef<Map<number, { lng: number; lat: number; photoUrl: string; container: HTMLDivElement }>>(
    new Map(),
  );
  const [styleLoaded, setStyleLoaded] = useState(false);
  // 처음 화면에 들어온 핀들의 사진이 다 로딩돼야 로딩 화면에서 지도로
  // 넘어간다 — 화면 밖 핀(드래그해야 보이는 핀)은 여기 포함되지 않는다.
  const initialBatchRef = useRef<Set<number> | null>(null);
  const loadedIdsRef = useRef<Set<number>>(new Set());
  const [initialPinsReady, setInitialPinsReady] = useState(false);

  function markPinLoaded(id: number) {
    loadedIdsRef.current.add(id);
    const batch = initialBatchRef.current;
    if (batch && Array.from(batch).every((bid) => loadedIdsRef.current.has(bid))) {
      setInitialPinsReady(true);
    }
  }

  const [mapPeriod, setMapPeriod] = useState<PeriodKey>("all");
  const [mapMood, setMapMood] = useState<Mood | "all">("all");
  const [showCustomPeriod, setShowCustomPeriod] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const periodRowRef = useRef<HTMLDivElement | null>(null);
  const moodRowRef = useRef<HTMLDivElement | null>(null);
  const periodDrag = useDragScroll(periodRowRef);
  const moodDrag = useDragScroll(moodRowRef);

  function applyCustomPeriod() {
    if (!customStart || !customEnd) {
      setShowCustomPeriod(false);
      return;
    }
    setMapPeriod("custom");
    setShowCustomPeriod(false);
  }

  // 기간·무드 필터를 통과한 기록만 지도에 핀으로 그린다.
  const mapRecords = useMemo(
    () =>
      records.filter(
        (r) =>
          (mapMood === "all" || r.ai_mood === mapMood) &&
          withinPeriod(r.created_at, mapPeriod, { start: customStart, end: customEnd })
      ),
    [records, mapMood, mapPeriod, customStart, customEnd]
  );

  // 걸어온 길은 무드가 없으므로 기간 필터만 적용한다.
  const mapTracks = useMemo(
    () => tracks.filter((t) => withinPeriod(t.started_at, mapPeriod, { start: customStart, end: customEnd })),
    [tracks, mapPeriod, customStart, customEnd]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // 처음 열 때는 가진 기록 전체를 한눈에 넣지 않는다 — 가장 최근 기록
    // 위치(없으면 기본 위치) 근처만 보여주고, 그 밖의 핀은 사용자가 드래그해서
    // 시야에 들어와야 사진을 불러온다. 안 그러면 핀 사진을 전부 한꺼번에
    // 내려받아야 해서(사진이 많거나 하나라도 크면) 지도가 느려진다.
    const latest = records[0];
    const initialCenter: [number, number] = latest ? [latest.longitude, latest.latitude] : DEFAULT_CENTER;

    const map = new MaplibreMap({
      container: containerRef.current,
      style: mapStyle as StyleSpecification,
      center: initialCenter,
      zoom: 14,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;
    map.once("load", () => {
      // 걸어온 길(저장된 트랙 + 진행 중인 산책) 두 레이어를 핀보다 아래에 깔아둔다.
      // 소스는 빈 채로 먼저 만들어두고, 데이터는 아래 effect가 setData로 채운다.
      map.addSource(TRACK_SOURCE, { type: "geojson", data: emptyFeatureCollection() });
      map.addLayer({
        id: TRACK_LAYER,
        type: "line",
        source: TRACK_SOURCE,
        layout: DOT_LINE_LAYOUT,
        paint: {
          "line-color": TRACK_COLOR,
          "line-width": 5,
          "line-opacity": 0.55,
          "line-dasharray": [0.33, 3],
        },
      });

      map.addSource(ACTIVE_SOURCE, { type: "geojson", data: emptyFeatureCollection() });
      map.addLayer({
        id: ACTIVE_LAYER,
        type: "line",
        source: ACTIVE_SOURCE,
        layout: DOT_LINE_LAYOUT,
        paint: {
          "line-color": TRACK_COLOR,
          "line-width": 6.5,
          "line-opacity": 1,
          "line-dasharray": [0.33, 3],
        },
      });

      setStyleLoaded(true);
    });

    // 화면 밖에 있던 핀이 드래그/줌으로 시야에 들어오면 그제서야 사진을 불러온다.
    map.on("moveend", () => {
      const bounds = map.getBounds();
      pendingPinsRef.current.forEach((pending, id) => {
        if (bounds.contains([pending.lng, pending.lat])) {
          loadPinPhoto(pending.container, pending.photoUrl, () => markPinLoaded(id));
          pendingPinsRef.current.delete(id);
        }
      });
    });

    // 컨테이너 크기가 마운트 시점 레이아웃과 어긋나거나(탭 전환 애니메이션,
    // 카드 접힘 등) 이후 바뀌는 경우를 대비해 캔버스를 계속 동기화한다 —
    // 그렇지 않으면 MapLibre가 최초 크기로 캔버스를 고정해버려 타일이
    // 실제 표시 영역과 다른 스케일로 잘못 계산될 수 있다.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 기록·필터가 바뀔 때마다 핀을 다시 그린다. 현재 시야 안에 있는 핀만 사진을
  // 바로 불러오고, 밖에 있는 핀은 pendingPinsRef에 넣어 moveend를 기다린다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function render() {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      pendingPinsRef.current.clear();

      const bounds = map!.getBounds();
      const inViewIds: number[] = [];

      markersRef.current = mapRecords.map((rec) => {
        const { el, photoContainer } = pinElement(rec);
        el.addEventListener("click", () => onSelectPin(rec));

        const photoUrl = imageUrls[rec.image_url];
        if (photoUrl) {
          if (bounds.contains([rec.longitude, rec.latitude])) {
            inViewIds.push(rec.id);
            loadPinPhoto(photoContainer, photoUrl, () => markPinLoaded(rec.id));
          } else {
            pendingPinsRef.current.set(rec.id, { lng: rec.longitude, lat: rec.latitude, photoUrl, container: photoContainer });
          }
        }

        return new Marker({ element: el, anchor: "center" })
          .setLngLat([rec.longitude, rec.latitude])
          .addTo(map!);
      });

      // 최초 한 번만 "초기 화면에 들어온 핀들"을 확정한다. imageUrls가 아직
      // 도착 전이라 사진 URL이 하나도 없는 패스는 건너뛰고 다음 렌더를 기다린다
      // — 안 그러면 빈 배치를 초기 기준으로 확정해버려 로딩 화면이 곧바로
      // (아무것도 안 기다리고) 넘어가 버린다.
      if (initialBatchRef.current === null && (mapRecords.length === 0 || Object.keys(imageUrls).length > 0)) {
        initialBatchRef.current = new Set(inViewIds);
        if (inViewIds.every((id) => loadedIdsRef.current.has(id))) {
          setInitialPinsReady(true);
        }
      }
    }

    if (map.isStyleLoaded()) render();
    else map.once("load", render);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRecords, imageUrls]);

  // 저장된 산책 경로를 점선으로 다시 그린다. 소스는 map load에서 만들어지므로
  // styleLoaded가 true가 되기 전에는 건너뛴다(그 뒤 이 effect가 다시 돈다).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;
    const source = map.getSource(TRACK_SOURCE) as GeoJSONSource | undefined;
    source?.setData(tracksToGeoJSON(mapTracks));
  }, [mapTracks, styleLoaded]);

  // 진행 중인 산책은 점이 하나 늘 때마다 즉시 선에 반영하고, 지도를 현재 위치로 따라 옮긴다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;
    const source = map.getSource(ACTIVE_SOURCE) as GeoJSONSource | undefined;
    source?.setData(activeTrackGeoJSON(tracker.points));

    const last = tracker.points[tracker.points.length - 1];

    // 현재 위치 발바닥 마커는 하나만 만들어두고 좌표만 옮긴다(매번 새로 만들면 깜빡인다).
    if (last) {
      if (!activeHeadRef.current) activeHeadRef.current = new Marker({ element: activeHeadElement(), anchor: "center" });
      activeHeadRef.current.setLngLat([last.lng, last.lat]).addTo(map);
    } else {
      activeHeadRef.current?.remove();
    }

    if (tracker.tracking && last) map.easeTo({ center: [last.lng, last.lat], duration: 600 });
  }, [tracker.points, tracker.tracking, styleLoaded]);

  // 진행 중일 때 경과 시간을 1초마다 갱신한다.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!tracker.tracking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tracker.tracking]);

  const hasPausedWalk = !tracker.tracking && tracker.points.length > 0;

  return (
    <div>
      <div style={{ padding: "2px 20px 12px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#2E2B24", padding: "6px 0 0", margin: 0 }}>지도</h1>
        <div style={{ fontSize: 13, color: "#8B8578", fontWeight: 500, padding: "4px 0 14px" }}>
          발자취가 쌓인 곳
        </div>
      </div>

      <div
        ref={periodRowRef}
        className="no-scrollbar"
        style={{ display: "flex", gap: 6, padding: "0 20px 10px", overflowX: "auto", cursor: "grab", userSelect: "none", WebkitUserSelect: "none" }}
        onPointerDown={periodDrag.onPointerDown}
        onPointerMove={periodDrag.onPointerMove}
        onPointerUp={periodDrag.onPointerUp}
        onPointerCancel={periodDrag.onPointerCancel}
        onClickCapture={periodDrag.onClickCapture}
      >
        {PERIODS.map((p) => {
          const active = mapPeriod === p.key;
          return (
            <div
              key={p.key}
              onClick={() => setMapPeriod(p.key)}
              style={{
                flexShrink: 0,
                padding: "7px 14px",
                borderRadius: 16,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                background: active ? "#2E2B24" : "#EFEBDD",
                color: active ? "#FAF6EC" : "#8B8578",
              }}
            >
              {p.label}
            </div>
          );
        })}
        <div
          onClick={() => setShowCustomPeriod(true)}
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "7px 14px",
            borderRadius: 16,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            background: mapPeriod === "custom" ? "#2E2B24" : "#EFEBDD",
            color: mapPeriod === "custom" ? "#FAF6EC" : "#8B8578",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="5"
              width="18"
              height="16"
              rx="3"
              stroke={mapPeriod === "custom" ? "#FAF6EC" : "#8B8578"}
              strokeWidth="2"
            />
            <path
              d="M3 10h18M8 3v4M16 3v4"
              stroke={mapPeriod === "custom" ? "#FAF6EC" : "#8B8578"}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          {mapPeriod === "custom" && customStart && customEnd ? `${customStart} ~ ${customEnd}` : "직접설정"}
        </div>
      </div>

      <div
        ref={moodRowRef}
        className="no-scrollbar"
        style={{ display: "flex", gap: 6, padding: "0 20px 14px", overflowX: "auto", cursor: "grab", userSelect: "none", WebkitUserSelect: "none" }}
        onPointerDown={moodDrag.onPointerDown}
        onPointerMove={moodDrag.onPointerMove}
        onPointerUp={moodDrag.onPointerUp}
        onPointerCancel={moodDrag.onPointerCancel}
        onClickCapture={moodDrag.onClickCapture}
      >
        <div
          onClick={() => setMapMood("all")}
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            padding: "6px 13px",
            borderRadius: 16,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            background: mapMood === "all" ? "#2E2B24" : "#EFEBDD",
            color: mapMood === "all" ? "#FAF6EC" : "#8B8578",
          }}
        >
          전체
        </div>
        {MOOD_LIST.map((mood) => {
          const active = mapMood === mood;
          return (
            <div
              key={mood}
              onClick={() => setMapMood(mood)}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 13px",
                borderRadius: 16,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                background: active ? MOOD_COLOR[mood] : "#EFEBDD",
                color: active ? "#FAF6EC" : "#8B8578",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: MOOD_COLOR[mood] }} />
              {mood}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "relative",
          margin: "0 16px 16px",
          height: 540,
          borderRadius: 24,
          overflow: "hidden",
          background: "#EEEDE1",
        }}
      >
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

        {(!styleLoaded || !initialPinsReady) && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#EEEDE1",
              zIndex: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 26,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 56 }}>
              {LOADING_FEET.map((f, i) => (
                <FootIcon key={i} {...f} />
              ))}
            </div>
            <div style={{ fontSize: 14, color: "#8B8578", fontWeight: 600 }}>발자취를 따라가는 중...</div>
          </div>
        )}

        {/* 산책 시작/종료 컨트롤 — 지도 위에 떠 있고, 지도가 다 뜬 뒤에만 보인다. */}
        {styleLoaded && initialPinsReady && (
          <div
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 16,
              zIndex: 6,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {tracker.error && (
              <div
                style={{
                  padding: "9px 14px",
                  borderRadius: 12,
                  background: "rgba(227,127,106,0.95)",
                  color: "#fff",
                  fontSize: 12.5,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                {tracker.error}
              </div>
            )}

            {(tracker.tracking || hasPausedWalk) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "11px 16px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.94)",
                  boxShadow: "0 4px 14px rgba(46,43,36,0.14)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: tracker.tracking ? TRACK_COLOR : "#B0AA98",
                      animation: tracker.tracking ? "wr-foot-pulse 1.4s ease-in-out infinite" : undefined,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#2E2B24" }}>
                    {formatDistance(tracker.distance)}
                  </span>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#8B8578" }}>
                  {tracker.startedAt ? formatDuration(now - tracker.startedAt) : "0분"} · 점 {tracker.points.length}개
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <div
                onClick={() => (tracker.tracking ? tracker.stop() : tracker.start())}
                style={{
                  flex: 1,
                  padding: "13px 16px",
                  borderRadius: 16,
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                  color: "#fff",
                  background: tracker.tracking ? "#2E2B24" : "linear-gradient(135deg,#F0A28C,#D97BA0)",
                  boxShadow: "0 4px 14px rgba(232,146,124,0.32)",
                }}
              >
                {tracker.tracking ? "산책 종료하고 저장" : hasPausedWalk ? "산책 이어가기" : "산책 시작"}
              </div>
              {hasPausedWalk && (
                <div
                  onClick={tracker.discard}
                  style={{
                    padding: "13px 16px",
                    borderRadius: 16,
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: "#8B8578",
                    background: "rgba(255,255,255,0.94)",
                    boxShadow: "0 4px 14px rgba(46,43,36,0.12)",
                  }}
                >
                  버리기
                </div>
              )}
            </div>
          </div>
        )}

        {records.length === 0 && tracks.length === 0 && (
          <div
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              top: 16,
              padding: "10px 14px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.88)",
              fontSize: 13,
              color: "#8B8578",
              fontWeight: 600,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            아직 발자취가 없어요
          </div>
        )}

        {(records.length > 0 || tracks.length > 0) && mapRecords.length === 0 && mapTracks.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: 13, color: "#9C9683", fontWeight: 600 }}>조건에 맞는 발자취가 없어요</span>
          </div>
        )}
      </div>

      {showCustomPeriod && (
        <div
          onClick={() => setShowCustomPeriod(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(46,43,36,0.4)",
            zIndex: 70,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#FAF6EC",
              borderRadius: "24px 24px 0 0",
              padding: "22px 22px 30px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: "#2E2B24" }}>기간 직접 설정</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12.5, color: "#8B8578", fontWeight: 600 }}>시작일</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{
                  border: "1.5px solid #E4DFCF",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 14,
                  fontFamily: "inherit",
                  color: "#2E2B24",
                  background: "#fff",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12.5, color: "#8B8578", fontWeight: 600 }}>종료일</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  border: "1.5px solid #E4DFCF",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 14,
                  fontFamily: "inherit",
                  color: "#2E2B24",
                  background: "#fff",
                }}
              />
            </div>
            <div
              onClick={applyCustomPeriod}
              style={{
                marginTop: 6,
                padding: 14,
                borderRadius: 16,
                background: "#2E2B24",
                color: "#FAF6EC",
                textAlign: "center",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              적용하기
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
