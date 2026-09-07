import type { Mood } from "@/lib/mood";

export interface WalkRecord {
  id: number;
  user_id: string;
  image_url: string; // walk-photos 버킷 안의 storage path (서명 URL은 매번 새로 발급)
  latitude: number;
  longitude: number;
  ai_caption: string;
  ai_tags: string[];
  ai_mood: Mood;
  created_at: string;
}

export interface PendingAnalysis {
  caption: string;
  tags: string[];
  mood: Mood;
}

// 산책 중 위치를 따라 찍은 한 점. t는 기록 시각(epoch ms) — 지도에 그릴 때
// 순서를 보장하고, 나중에 속도/시간 통계를 붙일 여지를 남긴다.
export interface TrackPoint {
  lat: number;
  lng: number;
  t: number;
}

export interface WalkTrack {
  id: number;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  distance_m: number;
  points: TrackPoint[];
  created_at: string;
}
