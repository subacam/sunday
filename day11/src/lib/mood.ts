// 산책기록.dc.html의 MOOD_COLOR/MOOD_BG를 그대로 옮긴 것 — 디자인 스펙 원본.
export const MOOD_LIST = [
  "평온",
  "설렘",
  "활기",
  "쓸쓸함",
  "그리움",
  "행복",
  "여유",
] as const;

export type Mood = (typeof MOOD_LIST)[number];

export const MOOD_COLOR: Record<Mood, string> = {
  평온: "#7FA372",
  설렘: "#E37F9C",
  활기: "#DBA426",
  쓸쓸함: "#748DA6",
  그리움: "#9C81C4",
  행복: "#E07A54",
  여유: "#4FA98E",
};

export const MOOD_BG: Record<Mood, string> = {
  평온: "linear-gradient(135deg,#EAF2E8,#9DBE9A)",
  설렘: "linear-gradient(135deg,#FBE9EE,#F2A9BE)",
  활기: "linear-gradient(135deg,#FDF2DC,#F3C463)",
  쓸쓸함: "linear-gradient(135deg,#EDF1F5,#9FB4C7)",
  그리움: "linear-gradient(135deg,#F1EBFA,#BFA8DE)",
  행복: "linear-gradient(135deg,#FCE9E1,#F0977A)",
  여유: "linear-gradient(135deg,#E6F5F0,#8FD0C0)",
};

export function isMood(value: string): value is Mood {
  return (MOOD_LIST as readonly string[]).includes(value);
}
