"use client";

import { useMemo, useState } from "react";
import { won } from "@/lib/format";
import { BudgetRow } from "@/lib/ledgerApi";
import { budgetProgress, buildInsight, categoryBreakdown, donutGradient, topMerchants, trendBars } from "@/lib/stats";
import { Expense } from "@/types/ledger";

type Period = "week" | "month" | "year";

function periodRange(period: Period, ref = new Date()) {
  if (period === "week") {
    const end = new Date(ref);
    end.setHours(23, 59, 59, 999);
    const start = new Date(ref);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const prevEnd = new Date(start);
    prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
    prevStart.setHours(0, 0, 0, 0);
    return { start, end, prevStart, prevEnd };
  }
  if (period === "year") {
    const start = new Date(ref.getFullYear(), 0, 1);
    const end = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
    const prevStart = new Date(ref.getFullYear() - 1, 0, 1);
    const prevEnd = new Date(ref.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { start, end, prevStart, prevEnd };
  }
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  const prevStart = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  const prevEnd = new Date(ref.getFullYear(), ref.getMonth(), 0, 23, 59, 59, 999);
  return { start, end, prevStart, prevEnd };
}

const PERIOD_LABEL: Record<Period, string> = { week: "이번 주", month: "이번 달", year: "올해" };

export default function DashboardTab({ expenses, budgets }: { expenses: Expense[]; budgets: BudgetRow[] }) {
  const [period, setPeriod] = useState<Period>("month");

  const { start, end, prevStart, prevEnd } = periodRange(period);
  const inRange = (iso: string, s: Date, e: Date) => {
    const t = new Date(iso).getTime();
    return t >= s.getTime() && t <= e.getTime();
  };
  const current = expenses.filter((e) => inRange(e.transactionAt, start, end));
  const previous = expenses.filter((e) => inRange(e.transactionAt, prevStart, prevEnd));
  const currentTotal = current.reduce((a, e) => a + e.totalAmount, 0);
  const prevTotal = previous.reduce((a, e) => a + e.totalAmount, 0);
  const changePct = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0;

  const breakdown = categoryBreakdown(current);
  const gradient = donutGradient(breakdown);
  const bars = useMemo(() => trendBars(expenses), [expenses]);
  const top5 = useMemo(() => topMerchants(expenses, new Date()), [expenses]);
  const budgetRows = useMemo(() => budgetProgress(expenses, budgets), [expenses, budgets]);
  const insight = useMemo(() => buildInsight(expenses, budgets), [expenses, budgets]);

  return (
    <div>
      <div style={{ padding: "58px 20px 6px" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1C1E1D" }}>대시보드</div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {(["week", "month", "year"] as Period[]).map((p) => (
            <div
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "7px 14px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 600,
                background: period === p ? "#1C1E1D" : "rgba(28,30,29,0.06)",
                color: period === p ? "#fff" : "rgba(28,30,29,0.55)",
                cursor: "pointer",
              }}
            >
              {p === "week" ? "주" : p === "month" ? "월" : "년"}
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin: "14px 20px", background: "#fff", borderRadius: 18, padding: 20 }}>
        <div style={{ fontSize: 13, color: "rgba(28,30,29,0.5)" }}>{PERIOD_LABEL[period]} 총 지출</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#1C1E1D" }}>{won(currentTotal)}</div>
          {prevTotal > 0 && (
            <div style={{ fontSize: 13, color: "#C1663F", fontWeight: 600 }}>
              {changePct >= 0 ? "+" : ""}
              {changePct}% (전{period === "week" ? "주" : period === "year" ? "년" : "월"} 대비)
            </div>
          )}
        </div>
      </div>

      {breakdown.length > 0 ? (
        <div style={{ margin: "0 20px 14px", background: "#fff", borderRadius: 18, padding: 20, display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 128, height: 128, borderRadius: "50%", background: gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 82, height: 82, borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(28,30,29,0.45)" }}>카테고리</div>
              <div style={{ fontSize: 11, color: "rgba(28,30,29,0.45)" }}>{breakdown.length}개</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {breakdown.map((b) => (
              <div key={b.category.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <div style={{ width: 9, height: 9, borderRadius: 3, background: b.category.color }} />
                <div style={{ flex: 1, color: "#1C1E1D" }}>{b.category.name}</div>
                <div style={{ color: "rgba(28,30,29,0.5)", fontWeight: 600 }}>{b.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyCard text={`${PERIOD_LABEL[period]} 기록된 지출이 없어요.`} />
      )}

      <div style={{ margin: "0 20px 14px", background: "#fff", borderRadius: 18, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1E1D", marginBottom: 14 }}>월별 추이</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 90 }}>
          {bars.map((t) => (
            <div key={t.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 6 }}>
              <div
                style={{
                  width: "100%",
                  borderRadius: "5px 5px 2px 2px",
                  background: t.isCurrent ? "#2B5A4C" : "rgba(43,90,76,0.25)",
                  height: `${t.heightPct}%`,
                }}
              />
              <div style={{ fontSize: 10.5, color: "rgba(28,30,29,0.45)" }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ margin: "0 20px 14px", background: "#fff", borderRadius: 18, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1E1D", marginBottom: 12 }}>이번 달 지출 top 5</div>
        {top5.length === 0 && <div style={{ fontSize: 13, color: "rgba(28,30,29,0.4)" }}>아직 데이터가 없어요.</div>}
        {top5.map((m) => (
          <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
            <div style={{ width: 22, fontSize: 13, fontWeight: 700, color: "rgba(28,30,29,0.35)" }}>{m.rank}</div>
            <div style={{ flex: 1, fontSize: 14, color: "#1C1E1D" }}>{m.name}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1C1E1D" }}>{won(m.amount)}</div>
          </div>
        ))}
      </div>

      <div style={{ margin: "0 20px 14px", background: "#fff", borderRadius: 18, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1E1D", marginBottom: 12 }}>예산 진행률</div>
        {budgetRows.length === 0 && (
          <div style={{ fontSize: 13, color: "rgba(28,30,29,0.4)" }}>마이 탭에서 카테고리별 예산을 설정해보세요.</div>
        )}
        {budgetRows.map((b) => (
          <div key={b.category.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <div style={{ color: "#1C1E1D", fontWeight: 600 }}>{b.category.name}</div>
              <div style={{ color: b.over ? "#C1663F" : "rgba(28,30,29,0.5)", fontWeight: 600 }}>
                {won(b.spent)} / {won(b.budget)}
              </div>
            </div>
            <div style={{ height: 8, borderRadius: 5, background: "rgba(28,30,29,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 5, width: `${b.pct}%`, background: b.over ? "#C1663F" : "#2B5A4C" }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ margin: "0 20px 100px", background: "#2B5A4C", borderRadius: 18, padding: 20 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: 700, marginBottom: 6 }}>AI 인사이트</div>
        <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.6 }}>{insight}</div>
      </div>
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div style={{ margin: "0 20px 14px", background: "#fff", borderRadius: 18, padding: 20, textAlign: "center", fontSize: 13, color: "rgba(28,30,29,0.4)" }}>
      {text}
    </div>
  );
}
