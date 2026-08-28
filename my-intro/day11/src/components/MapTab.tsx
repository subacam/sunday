"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MaplibreMap, Marker, type StyleSpecification } from "maplibre-gl";
import mapStyle from "@/lib/mapStyle.json";
import { MOOD_BG, MOOD_COLOR, MOOD_LIST, type Mood } from "@/lib/mood";
import type { WalkRecord } from "@/types/walk";

// 사용자가 실제로 걸은 곳이 없을 때 보여줄 기본 중심 — 서울시청.
const DEFAULT_CENTER: [number, number] = [126.978, 37.5665];

type PeriodKey = "all" | "7d" | "30d" | "90d" | "custom";

const PERIODS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: "all", label: "전체", days: null },
  { key: "7d", label: "최근 1주", days: 7 },
  { key: "30d", label: "최근 1개월", days: 30 },
  { key: "90d", label: "최근 3개월", days: 90 },
];

function withinPeriod(rec: WalkRecord, key: PeriodKey, custom: { start: string; end: string }) {
  if (key === "custom") {
    if (!custom.start || !custom.end) return true;
    const start = new Date(custom.start);
    const end = new Date(custom.end);
    end.setHours(23, 59, 59, 999);
    const recDate = new Date(rec.created_at);
    return recDate >= start && recDate <= end;
  }
  const period = PERIODS.find((p) => p.key === key);
  if (!period || period.days == null) return true;
  const diffDays = (Date.now() - new Date(rec.created_at).getTime()) / 86400000;
  return diffDays <= period.days;
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
    <svg
      width="22"
      height="30"
      viewBox="0 0 22 30"
      style={{
        overflow: "visible",
        transform: `translateY(${offset}px) rotate(${rotate}deg)`,
        animation: `wr-foot-step 0.5s ease-out ${delay}s both, wr-foot-pulse 1.6s ease-in-out ${delay}s infinite`,
      }}
    >
      <ellipse cx="11" cy="19" rx="8" ry="10.5" fill={color} />
      <ellipse cx="4" cy="4.5" rx="3" ry="4" fill={color} />
      <ellipse cx="11" cy="1.5" rx="3.2" ry="4.3" fill={color} />
      <ellipse cx="18" cy="4.5" rx="3" ry="4" fill={color} />
    </svg>
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

function loadPinPhoto(photoContainer: HTMLDivElement, photoUrl: string) {
  const img = document.createElement("img");
  img.src = photoUrl;
  img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
  photoContainer.appendChild(img);
}

export default function MapTab({
  records,
  imageUrls,
  onSelectPin,
}: {
  records: WalkRecord[];
  imageUrls: Record<string, string>;
  onSelectPin: (record: WalkRecord) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  // 화면 밖이라 아직 사진을 안 불러온 핀들 — moveend 때마다 현재 시야와 대조한다.
  const pendingPinsRef = useRef<Map<number, { lng: number; lat: number; photoUrl: string; container: HTMLDivElement }>>(
    new Map(),
  );
  const [styleLoaded, setStyleLoaded] = useState(false);

  const [mapPeriod, setMapPeriod] = useState<PeriodKey>("all");
  const [mapMood, setMapMood] = useState<Mood | "all">("all");
  const [showCustomPeriod, setShowCustomPeriod] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

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
        (r) => (mapMood === "all" || r.ai_mood === mapMood) && withinPeriod(r, mapPeriod, { start: customStart, end: customEnd })
      ),
    [records, mapMood, mapPeriod, customStart, customEnd]
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
    map.once("load", () => setStyleLoaded(true));

    // 화면 밖에 있던 핀이 드래그/줌으로 시야에 들어오면 그제서야 사진을 불러온다.
    map.on("moveend", () => {
      const bounds = map.getBounds();
      pendingPinsRef.current.forEach((pending, id) => {
        if (bounds.contains([pending.lng, pending.lat])) {
          loadPinPhoto(pending.container, pending.photoUrl);
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

      markersRef.current = mapRecords.map((rec) => {
        const { el, photoContainer } = pinElement(rec);
        el.addEventListener("click", () => onSelectPin(rec));

        const photoUrl = imageUrls[rec.image_url];
        if (photoUrl) {
          if (bounds.contains([rec.longitude, rec.latitude])) {
            loadPinPhoto(photoContainer, photoUrl);
          } else {
            pendingPinsRef.current.set(rec.id, { lng: rec.longitude, lat: rec.latitude, photoUrl, container: photoContainer });
          }
        }

        return new Marker({ element: el, anchor: "center" })
          .setLngLat([rec.longitude, rec.latitude])
          .addTo(map!);
      });
    }

    if (map.isStyleLoaded()) render();
    else map.once("load", render);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapRecords, imageUrls]);

  return (
    <div>
      <div style={{ padding: "2px 20px 12px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#2E2B24", padding: "6px 0 0", margin: 0 }}>지도</h1>
        <div style={{ fontSize: 13, color: "#8B8578", fontWeight: 500, padding: "4px 0 14px" }}>
          발자취가 쌓인 곳
        </div>
      </div>

      <div className="no-scrollbar" style={{ display: "flex", gap: 6, padding: "0 20px 10px", overflowX: "auto" }}>
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

      <div className="no-scrollbar" style={{ display: "flex", gap: 6, padding: "0 20px 14px", overflowX: "auto" }}>
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

        {!styleLoaded && (
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

        {records.length === 0 && (
          <div
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              bottom: 16,
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

        {records.length > 0 && mapRecords.length === 0 && (
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
