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
