import type { WalkRecord } from "@/types/walk";

// PWA가 백그라운드에서 종료됐다가(모바일 OS가 흔히 그런다) 다시 열리면 boot()가
// 처음부터 다시 돌면서 loadRecords()가 새로 나간다 — 이때 재개 직후라 아직
// 네트워크가 안 붙어 있으면 요청이 실패하고, 기록 state는 fresh useState([])라
// 피드가 "기록이 하나도 없어요"로 보인다. 마지막으로 성공한 목록을 계정별로
// localStorage에 남겨뒀다가, 실패했을 때 그걸로라도 채운다.
const RECORDS_CACHE_PREFIX = "walk_records_cache_";

export function readRecordsCache(userId: string): WalkRecord[] | null {
  try {
    const raw = window.localStorage.getItem(RECORDS_CACHE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WalkRecord[]) : null;
  } catch {
    return null;
  }
}

export function writeRecordsCache(userId: string, records: WalkRecord[]) {
  try {
    window.localStorage.setItem(RECORDS_CACHE_PREFIX + userId, JSON.stringify(records));
  } catch {
    // 저장 실패(용량 초과 등)해도 앱 동작에는 지장 없으므로 조용히 무시한다.
  }
}
