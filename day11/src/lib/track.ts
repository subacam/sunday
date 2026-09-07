import type { TrackPoint, WalkTrack } from "@/types/walk";

// GPS가 튀는 점(정확도가 나쁜 측정, 실내에서의 순간 점프)을 그대로 이으면
// 실제로 걷지 않은 거리가 수백 m씩 더해진다. 아래 두 임계값으로 걸러낸다.
const MIN_STEP_M = 5; // 이보다 가까우면 제자리 흔들림으로 보고 점을 추가하지 않는다
const MAX_JUMP_M = 200; // 이보다 멀면 GPS 튐으로 보고 거리 합산에서 제외한다
const MAX_ACCURACY_M = 50; // 이보다 부정확한 측정은 아예 버린다

export function haversineMeters(a: TrackPoint, b: TrackPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function trackDistanceMeters(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const step = haversineMeters(points[i - 1], points[i]);
    if (step <= MAX_JUMP_M) total += step;
  }
  return total;
}

// watchPosition 콜백에서 받은 좌표를 트랙에 추가할지 판단한다.
// 추가하지 않기로 하면 null을 돌려주고, 호출부는 상태를 그대로 둔다.
export function nextTrackPoint(
  points: TrackPoint[],
  position: GeolocationPosition,
): TrackPoint | null {
  const { latitude, longitude, accuracy } = position.coords;
  if (typeof accuracy === "number" && accuracy > MAX_ACCURACY_M) return null;
  const point: TrackPoint = { lat: latitude, lng: longitude, t: position.timestamp };
  const last = points[points.length - 1];
  if (!last) return point;
  const step = haversineMeters(last, point);
  if (step < MIN_STEP_M || step > MAX_JUMP_M) return null;
  return point;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
}

export function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

// GPS 좌표는 몇 m씩 좌우로 흔들리는 노이즈가 섞여 있어(MIN_STEP_M=5m을 넘겼다는
// 이유만으로는 못 거르는 수준의 흔들림), 점을 그대로 이으면 실제로 걷지 않은
// 지그재그가 지도 위 선에 그대로 드러난다. 거리 계산(trackDistanceMeters)에는
// 원본 points를 그대로 쓰고, **지도에 그릴 좌표에만** 가중 이동평균을 몇 차례
// 반복 적용해 매끄럽게 만든다 — 시작점/끝점은 고정해서 진행 중인 산책의 현재
// 위치 마커(activeHeadElement, 원본 마지막 점을 그대로 씀)와 선의 끝이 어긋나지
// 않게 한다.
function smoothCoordinates(coords: [number, number][], passes = 2): [number, number][] {
  if (coords.length < 3) return coords;
  let result = coords;
  for (let pass = 0; pass < passes; pass++) {
    const next: [number, number][] = [result[0]];
    for (let i = 1; i < result.length - 1; i++) {
      const [px, py] = result[i - 1];
      const [x, y] = result[i];
      const [nx, ny] = result[i + 1];
      next.push([x * 0.5 + (px + nx) * 0.25, y * 0.5 + (py + ny) * 0.25]);
    }
    next.push(result[result.length - 1]);
    result = next;
  }
  return result;
}

export function toSmoothedCoordinates(points: TrackPoint[]): [number, number][] {
  return smoothCoordinates(points.map((p) => [p.lng, p.lat] as [number, number]));
}

// 트랙을 지도에 그릴 GeoJSON으로 바꾼다. 점이 2개 미만이면 선이 되지 않으므로 제외한다.
export function tracksToGeoJSON(tracks: WalkTrack[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: tracks
      .filter((t) => t.points.length >= 2)
      .map((t) => ({
        type: "Feature" as const,
        properties: { id: t.id },
        geometry: {
          type: "LineString" as const,
          coordinates: toSmoothedCoordinates(t.points),
        },
      })),
  };
}
