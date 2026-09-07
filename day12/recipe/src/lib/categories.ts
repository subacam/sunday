import { Category, CategoryId } from "@/types/ledger";

// 디자인 핸드오프(가계부 앱.dc.html)의 CATEGORIES 상수를 그대로 옮긴 고정 카테고리 8종.
// 디자인 자체가 "+ 카테고리 추가" 버튼에 동작을 연결하지 않은 것과 동일하게,
// 이 세트는 v1에서 사용자가 커스텀 추가/삭제할 수 없는 고정 목록이다.
export const CATEGORIES: Category[] = [
  { id: "food", name: "식비", short: "식", color: "#C1663F" },
  { id: "cafe", name: "카페", short: "카", color: "#B08A3E" },
  { id: "transport", name: "교통", short: "교", color: "#3E6E8A" },
  { id: "shopping", name: "쇼핑", short: "쇼", color: "#7E5C96" },
  { id: "health", name: "의료", short: "의", color: "#4C8A6C" },
  { id: "culture", name: "문화", short: "문", color: "#B14F79" },
  { id: "living", name: "생활", short: "생", color: "#5D7A88" },
  { id: "etc", name: "기타", short: "기", color: "#8C8578" },
];

export const categoryById: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<CategoryId, Category>
);
