import { CATEGORIES, categoryById } from "@/lib/categories";
import { won } from "@/lib/format";
import { BudgetRow, CategoryTotal } from "@/lib/ledgerApi";
import { CategoryId, Expense } from "@/types/ledger";

// 트렌드 탭이 "충분한 표본"으로 취급하기 위한 최소 활동 사용자 수.
// 이 미만이면 개인 데이터가 사실상 그대로 드러나는 셈이라 비교 위젯 대신 빈 상태를 보여준다.
const MIN_PEER_SAMPLE = 2;

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function isInMonth(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function sumAmount(expenses: Expense[]) {
  return expenses.reduce((a, e) => a + e.totalAmount, 0);
}

export function categoryBreakdown(expenses: Expense[]) {
  const totalsByCategory = new Map<CategoryId, number>();
  for (const e of expenses) {
    totalsByCategory.set(e.categoryId, (totalsByCategory.get(e.categoryId) ?? 0) + e.totalAmount);
  }
  const total = sumAmount(expenses);
  return CATEGORIES.filter((c) => (totalsByCategory.get(c.id) ?? 0) > 0).map((c) => {
    const amount = totalsByCategory.get(c.id) ?? 0;
    const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
    return { category: c, amount, pct };
  });
}

export function donutGradient(breakdown: { category: { color: string }; pct: number }[]) {
  let acc = 0;
  const parts = breakdown.map((b) => {
    const start = acc;
    acc += b.pct;
    return `${b.category.color} ${start}% ${acc}%`;
  });
  if (parts.length === 0) return "conic-gradient(rgba(28,30,29,0.08) 0% 100%)";
  return `conic-gradient(${parts.join(",")})`;
}

export function lastNMonths(n: number, ref = new Date()) {
  const months: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push(new Date(ref.getFullYear(), ref.getMonth() - i, 1));
  }
  return months;
}

export function trendBars(expenses: Expense[]) {
  const months = lastNMonths(6);
  const totals = months.map((m) => {
    const key = monthKey(m.toISOString());
    const total = expenses
      .filter((e) => monthKey(e.transactionAt) === key)
      .reduce((a, e) => a + e.totalAmount, 0);
    return { label: `${m.getMonth() + 1}월`, value: total, isCurrent: key === monthKey(new Date().toISOString()) };
  });
  const max = Math.max(1, ...totals.map((t) => t.value));
  return totals.map((t) => ({
    label: t.label,
    heightPct: Math.max(4, Math.round((t.value / max) * 100)),
    isCurrent: t.isCurrent,
  }));
}

export function topMerchants(expenses: Expense[], monthRef: Date, limit = 5) {
  const byMerchant = new Map<string, number>();
  for (const e of expenses) {
    if (!isInMonth(e.transactionAt, monthRef)) continue;
    byMerchant.set(e.merchant, (byMerchant.get(e.merchant) ?? 0) + e.totalAmount);
  }
  return [...byMerchant.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, amount], i) => ({ rank: i + 1, name, amount }));
}

export function budgetProgress(expenses: Expense[], budgets: BudgetRow[], monthRef = new Date()) {
  return budgets
    .filter((b) => b.monthlyAmount > 0)
    .map((b) => {
      const spent = expenses
        .filter((e) => e.categoryId === b.categoryId && isInMonth(e.transactionAt, monthRef))
        .reduce((a, e) => a + e.totalAmount, 0);
      const pct = Math.min(100, Math.round((spent / b.monthlyAmount) * 100));
      return { category: categoryById[b.categoryId], spent, budget: b.monthlyAmount, pct, over: pct >= 90 };
    });
}

export function monthChangePct(expenses: Expense[]) {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthTotal = expenses.filter((e) => isInMonth(e.transactionAt, now)).reduce((a, e) => a + e.totalAmount, 0);
  const prevMonthTotal = expenses.filter((e) => isInMonth(e.transactionAt, prev)).reduce((a, e) => a + e.totalAmount, 0);
  const pct = prevMonthTotal > 0 ? Math.round(((thisMonthTotal - prevMonthTotal) / prevMonthTotal) * 100) : 0;
  return { thisMonthTotal, prevMonthTotal, pct };
}

// 규칙 기반 "AI 인사이트" 문구 생성. 별도 LLM 호출 없이, 이번 달 카테고리별 지출을
// 지난달과 비교해 가장 크게 늘어난 카테고리를 찾고 해당 카테고리 예산 대비 소진율을 덧붙인다.
export function buildInsight(expenses: Expense[], budgets: BudgetRow[]): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b.monthlyAmount]));

  const thisMonthByCategory = new Map<CategoryId, number>();
  const prevMonthByCategory = new Map<CategoryId, number>();
  for (const e of expenses) {
    if (isInMonth(e.transactionAt, now)) {
      thisMonthByCategory.set(e.categoryId, (thisMonthByCategory.get(e.categoryId) ?? 0) + e.totalAmount);
    } else if (isInMonth(e.transactionAt, prev)) {
      prevMonthByCategory.set(e.categoryId, (prevMonthByCategory.get(e.categoryId) ?? 0) + e.totalAmount);
    }
  }

  let best: { categoryId: CategoryId; pct: number; amount: number } | null = null;
  for (const [categoryId, amount] of thisMonthByCategory) {
    const prevAmount = prevMonthByCategory.get(categoryId) ?? 0;
    if (prevAmount <= 0) continue;
    const pct = Math.round(((amount - prevAmount) / prevAmount) * 100);
    if (pct > 0 && (!best || pct > best.pct)) best = { categoryId, pct, amount };
  }

  if (best) {
    const cat = categoryById[best.categoryId];
    const budget = budgetByCategory.get(best.categoryId);
    const budgetClause = budget
      ? ` 예산의 ${Math.min(999, Math.round((best.amount / budget) * 100))}%를 썼어요.`
      : ".";
    return `${cat.name} 지출이 지난달보다 ${best.pct}% 늘어${budgetClause}`;
  }

  const thisMonthTotal = [...thisMonthByCategory.values()].reduce((a, b) => a + b, 0);
  const topEntry = [...thisMonthByCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topEntry && thisMonthTotal > 0) {
    const [categoryId, amount] = topEntry;
    const pct = Math.round((amount / thisMonthTotal) * 100);
    return `이번 달은 ${categoryById[categoryId].name} 지출 비중이 ${pct}%로 가장 커요. 총 ${won(thisMonthTotal)}을 썼어요.`;
  }

  return "이번 달 첫 지출을 기록해보세요. 영수증만 찍으면 AI가 나머지를 채워드려요.";
}

export interface PeerCompareRow {
  category: (typeof CATEGORIES)[number];
  mine: number;
  avg: number;
  over: boolean;
  diffPct: number;
  ratioPct: number;
}

// 이번 달 카테고리별 "내 지출 vs 전체 사용자 평균". avg = 카테고리 합계 / 참여 사용자 수
// (개별 사용자 행은 절대 받지 않고, 집계된 합계·건수만으로 계산 — PRD 4.9 참고).
export function buildPeerCompare(myExpenses: Expense[], categoryTotals: CategoryTotal[]): PeerCompareRow[] {
  const now = new Date();
  const totalsById = new Map(categoryTotals.map((c) => [c.categoryId, c]));
  const myByCategory = new Map<CategoryId, number>();
  for (const e of myExpenses) {
    if (!isInMonth(e.transactionAt, now)) continue;
    myByCategory.set(e.categoryId, (myByCategory.get(e.categoryId) ?? 0) + e.totalAmount);
  }

  const categoryIds = new Set<CategoryId>([...myByCategory.keys(), ...totalsById.keys()]);
  const rows: PeerCompareRow[] = [];
  for (const id of categoryIds) {
    const totals = totalsById.get(id);
    if (!totals || totals.userCount < MIN_PEER_SAMPLE) continue;
    const mine = myByCategory.get(id) ?? 0;
    const avg = Math.round(totals.totalAmount / totals.userCount);
    if (mine === 0 && avg === 0) continue;
    const over = mine > avg;
    const diffPct = avg > 0 ? Math.round((Math.abs(mine - avg) / avg) * 100) : 100;
    const ratioPct = Math.min(100, Math.round((mine / Math.max(mine, avg, 1)) * 100));
    rows.push({ category: categoryById[id], mine, avg, over, diffPct, ratioPct });
  }
  return rows.sort((a, b) => b.mine - a.mine);
}

export interface PopularCategoryRow {
  category: (typeof CATEGORIES)[number];
  pct: number;
}

// 이번 주 전체 사용자 기준 인기 소비 카테고리 비중.
export function buildPopularCategories(categoryTotals: CategoryTotal[]): PopularCategoryRow[] {
  const grand = categoryTotals.reduce((a, c) => a + c.totalAmount, 0);
  if (grand === 0) return [];
  return categoryTotals
    .filter((c) => c.totalAmount > 0)
    .map((c) => ({ category: categoryById[c.categoryId], pct: Math.round((c.totalAmount / grand) * 100) }))
    .sort((a, b) => b.pct - a.pct);
}

// 트렌드 탭 전체를 보여주기에 표본이 충분한지 — 카테고리 무관하게 이번 달 활동한
// 전체 사용자 수(= 각 카테고리 user_count의 최댓값으로 근사)가 최소 기준 이상인지.
export function hasEnoughPeerSample(categoryTotals: CategoryTotal[]): boolean {
  return categoryTotals.some((c) => c.userCount >= MIN_PEER_SAMPLE);
}
