import { createClient } from "@supabase/supabase-js";

// Supabase 프로젝트 "subacam's Project"(day4/day8과 공유, id srhnwzcnimadmoyfukwd)의
// URL과 publishable(anon) 키. 비밀값이 아니다 — day4/auth.js, day8/index.html과 같은 이유로
// 소스에 그대로 둔다. RLS가 실제 접근 범위를 통제한다.
const SUPABASE_URL = "https://srhnwzcnimadmoyfukwd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lszrxj-ZCq3itUfcrqatrg_HPefI61I";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const GEMINI_VISION_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/gemini-vision`;
export const WALK_PHOTOS_BUCKET = "walk-photos";
