import { MOOD_COLOR, MOOD_LIST, type Mood } from "@/lib/mood";
import type { WalkRecord, WalkTrack } from "@/types/walk";

// 산책기록.dc.html renderVals()의 계산식을 그대로 재사용 — 실데이터에 대해 다시 계산한다.

const WEEK_ORDER = ["월", "화", "수", "목", "금", "토", "일"] as const;
const CLOUD_COLORS = ["#2E2B24", "#8FAE8B", "#E8927C", "#8B8578"];

function dayLabel(iso: string): (typeof WEEK_ORDER)[number] {
  const jsDay = new Date(iso).getDay(); // 0=일 .. 6=토
  const idx = (jsDay + 6) % 7; // 0=월 .. 6=일
  return WEEK_ORDER[idx];
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

// --- 걸은 거리 통계 -----------------------------------------------------------
// 주의 시작은 월요일 00:00(로컬). WEEK_ORDER가 월요일부터인 것과 맞춘다.
export function startOfThisWeek(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function thisWeekTracks(tracks: WalkTrack[], now = new Date()): WalkTrack[] {
  const start = startOfThisWeek(now).getTime();
  return tracks.filter((t) => new Date(t.started_at).getTime() >= start);
}

export function totalDistance(tracks: WalkTrack[]): number {
  return tracks.reduce((sum, t) => sum + (t.distance_m || 0), 0);
}

// 이번 주 월~일 요일별로 걸은 거리(m)를 합산한다. 예전의 "요일별 기록 수"가
// 전체 기간을 요일로 뭉갠 것과 달리, 바로 위 "이번주 걸은 거리" 카드와 같은 범위를
// 써서 막대의 합이 카드 값과 정확히 일치하도록 했다.
export function computeWeekDistance(tracks: WalkTrack[], now = new Date()) {
  const week = thisWeekTracks(tracks, now);
  const meters = WEEK_ORDER.map((d) =>
    week.filter((t) => dayLabel(t.started_at) === d).reduce((sum, t) => sum + (t.distance_m || 0), 0)
  );
  const maxMeters = Math.max(1, ...meters);
  return WEEK_ORDER.map((day, i) => ({
    day,
    meters: meters[i],
    heightPct: meters[i] === 0 ? 6 : Math.max(14, Math.round((meters[i] / maxMeters) * 100)),
    barColor: meters[i] === 0 ? "#EEEADD" : "#9DBE9A",
  }));
}
