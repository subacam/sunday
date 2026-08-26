"use client";

import { useEffect, useRef } from "react";
import { Map as MaplibreMap, Marker, LngLatBounds, type StyleSpecification } from "maplibre-gl";
import mapStyle from "@/lib/mapStyle.json";
import { MOOD_COLOR } from "@/lib/mood";
import type { WalkRecord } from "@/types/walk";

// 사용자가 실제로 걸은 곳이 없을 때 보여줄 기본 중심 — 서울시청.
const DEFAULT_CENTER: [number, number] = [126.978, 37.5665];

function pinElement(record: WalkRecord) {
  const el = document.createElement("div");
  el.style.cursor = "pointer";
  el.innerHTML = `
    <svg width="26" height="34" viewBox="0 0 20 26">
      <path d="M10 0C4.5 0 0 4.5 0 10c0 7 10 16 10 16s10-9 10-16C20 4.5 15.5 0 10 0z" fill="${MOOD_COLOR[record.ai_mood]}"></path>
      <circle cx="10" cy="10" r="4" fill="#fff"></circle>
    </svg>
  `;
  return el;
}

export default function MapTab({
  records,
  onSelectPin,
}: {
  records: WalkRecord[];
  onSelectPin: (record: WalkRecord) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MaplibreMap({
      container: containerRef.current,
      style: mapStyle as StyleSpecification,
      center: DEFAULT_CENTER,
      zoom: 13,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

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
  }, []);

  // 기록이 바뀔 때마다 핀을 다시 그리고, 있으면 그 범위에 맞춰 카메라를 옮긴다.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function render() {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = records.map((rec) => {
        const el = pinElement(rec);
        el.addEventListener("click", () => onSelectPin(rec));
        return new Marker({ element: el, anchor: "bottom" })
          .setLngLat([rec.longitude, rec.latitude])
          .addTo(map!);
      });

      if (records.length > 0) {
        const bounds = new LngLatBounds();
        records.forEach((r) => bounds.extend([r.longitude, r.latitude]));
        map!.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 0 });
      }
    }

    if (map.isStyleLoaded()) render();
    else map.once("load", render);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  return (
    <div>
      <div style={{ padding: "2px 20px 12px" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#2E2B24", padding: "6px 0 0" }}>지도</div>
        <div style={{ fontSize: 13, color: "#8B8578", fontWeight: 500, padding: "4px 0 14px" }}>
          발자취가 쌓인 곳
        </div>
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
      </div>
    </div>
  );
}
