import { MOOD_COLOR, MOOD_LIST, type Mood } from "@/lib/mood";
import type { WalkRecord } from "@/types/walk";

// 산책기록.dc.html renderVals()의 계산식을 그대로 재사용 — 실데이터에 대해 다시 계산한다.

const WEEK_ORDER = ["월", "화", "수", "목", "금", "토", "일"] as const;
const CLOUD_COLORS = ["#2E2B24", "#8FAE8B", "#E8927C", "#8B8578"];

function dayLabel(iso: string): (typeof WEEK_ORDER)[number] {
  const jsDay = new Date(iso).getDay(); // 0=일 .. 6=토
  const idx = (jsDay + 6) % 7; // 0=월 .. 6=일
  return WEEK_ORDER[idx];
}

export function computeWeekData(records: WalkRecord[]) {
  const counts = WEEK_ORDER.map(
    (d) => records.filter((r) => dayLabel(r.created_at) === d).length
  );
  const maxCount = Math.max(1, ...counts);
  return WEEK_ORDER.map((day, i) => ({
    day,
    count: counts[i],
    heightPct: counts[i] === 0 ? 6 : Math.max(14, Math.round((counts[i] / maxCount) * 100)),
    barColor: counts[i] === 0 ? "#EEEADD" : "#9DBE9A",
  }));
}

export function computeTagCloud(records: WalkRecord[]) {
  const freq = new Map<string, number>();
  records.forEach((r) => r.ai_tags.forEach((t) => freq.set(t, (freq.get(t) || 0) + 1)));
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  return sorted.map(([word, count], i) => {
    const weight = Math.min(count, 5); // 태그가 아주 많이 몰려도 폰트가 과하게 커지지 않도록 상한
    return { word, size: 12 + weight * 6, color: CLOUD_COLORS[i % CLOUD_COLORS.length] };
  });
}

export function computeMoodDist(records: WalkRecord[]) {
  if (records.length === 0) return [];
  const counts = new Map<Mood, number>();
  records.forEach((r) => counts.set(r.ai_mood, (counts.get(r.ai_mood) || 0) + 1));
  return MOOD_LIST.filter((m) => counts.has(m)).map((mood) => ({
    mood,
    pct: Math.round(((counts.get(mood) || 0) / records.length) * 100),
    color: MOOD_COLOR[mood],
  }));
}

export function computeDonutGradient(moodLegend: { color: string; pct: number }[]) {
  let acc = 0;
  const parts = moodLegend.map((m) => {
    const from = acc;
    const to = acc + m.pct * 3.6;
    acc = to;
    return `${m.color} ${from}deg ${to}deg`;
  });
  return parts.length ? `conic-gradient(${parts.join(", ")})` : "#F3EFE4";
}

// 지도: 실지도 SDK 없이, 사용자의 기록 위경도 범위를 15%~85% 캔버스에 정규화해 핀을 뿌린다.
export function projectRecordsToMap(records: WalkRecord[]) {
  if (records.length === 0) return [];
  const lats = records.map((r) => r.latitude);
  const lngs = records.map((r) => r.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;

  return records.map((r) => {
    const left = lngRange === 0 ? 50 : 15 + ((r.longitude - minLng) / lngRange) * 70;
    // 위도는 위로 갈수록 커지므로 화면 top 기준으로 뒤집는다.
    const top = latRange === 0 ? 50 : 15 + ((maxLat - r.latitude) / latRange) * 70;
    return { record: r, left, top };
  });
}
