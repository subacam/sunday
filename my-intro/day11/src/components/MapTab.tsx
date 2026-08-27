"use client";

import { useEffect, useRef } from "react";
import { Map as MaplibreMap, Marker, LngLatBounds, type StyleSpecification } from "maplibre-gl";
import mapStyle from "@/lib/mapStyle.json";
import { MOOD_BG } from "@/lib/mood";
import type { WalkRecord } from "@/types/walk";

// 사용자가 실제로 걸은 곳이 없을 때 보여줄 기본 중심 — 서울시청.
const DEFAULT_CENTER: [number, number] = [126.978, 37.5665];

// 테두리를 무드 단색이 아니라 피드 카드와 같은 MOOD_BG 그라디언트로 채워
// Clay 디자인의 코랄 그라디언트 톤(버튼/아바타/FAB)과 같은 계열로 맞춘다.
// border는 그라디언트를 못 그려서, padding으로 링 두께를 만드는 방식을 쓴다.
function pinElement(record: WalkRecord, photoUrl: string | undefined) {
  const el = document.createElement("div");
  el.style.cursor = "pointer";
  el.style.width = "40px";
  el.style.height = "40px";
  el.style.borderRadius = "50%";
  el.style.padding = "3px";
  el.style.background = MOOD_BG[record.ai_mood];
  el.style.boxShadow = "0 2px 6px rgba(46,43,36,0.3)";
  // signed URL이 아직 도착하지 않았으면 흰 원만 보여준다.
  el.innerHTML = `
    <div style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:#fff;">
      ${photoUrl ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" />` : ""}
    </div>
  `;
  return el;
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
        const el = pinElement(rec, imageUrls[rec.image_url]);
        el.addEventListener("click", () => onSelectPin(rec));
        return new Marker({ element: el, anchor: "center" })
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
  }, [records, imageUrls]);

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
