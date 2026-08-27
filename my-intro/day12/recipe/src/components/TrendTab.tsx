"use client";

import { useEffect, useState } from "react";
import { won } from "@/lib/format";
import { CategoryTotal, getCategoryTotals } from "@/lib/ledgerApi";
import { buildPeerCompare, buildPopularCategories, hasEnoughPeerSample } from "@/lib/stats";
import { Expense } from "@/types/ledger";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function TrendTab({ expenses }: { expenses: Expense[] }) {
  const [monthTotals, setMonthTotals] = useState<CategoryTotal[] | null>(null);
  const [weekTotals, setWeekTotals] = useState<CategoryTotal[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCategoryTotals(startOfMonth()), getCategoryTotals(startOfWeek())])
      .then(([month, week]) => {
        if (cancelled) return;
        setMonthTotals(month);
        setWeekTotals(week);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = monthTotals === null || weekTotals === null;
  const enoughSample = !loading && hasEnoughPeerSample(monthTotals!);
  const peerRows = !loading && enoughSample ? buildPeerCompare(expenses, monthTotals!) : [];
  const popularRows = !loading && hasEnoughPeerSample(weekTotals!) ? buildPopularCategories(weekTotals!) : [];

  return (
    <div>
      <div style={{ padding: "58px 20px 6px" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1C1E1D" }}>트렌드</div>
        <div style={{ fontSize: 13, color: "rgba(28,30,29,0.5)", marginTop: 4 }}>
          다른 사람들은 얼마나 쓸까요? (전체 사용자 익명 데이터 기반)
        </div>
      </div>

      <div style={{ margin: "12px 20px 14px", background: "#fff", borderRadius: 18, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1E1D", marginBottom: 14 }}>또래 평균과 비교</div>
        {error && <EmptyText text="비교 데이터를 불러오지 못했어요." />}
        {!error && loading && <EmptyText text="불러오는 중..." />}
        {!error && !loading && !enoughSample && <EmptyText text="아직 비교할 사용자가 충분하지 않아요." />}
        {!error && !loading && enoughSample && peerRows.length === 0 && (
          <EmptyText text="아직 비교할 카테고리 데이터가 없어요." />
        )}
        {peerRows.map((p) => (
          <div key={p.category.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1C1E1D" }}>{p.category.name}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: p.over ? "#C1663F" : "#2B5A4C" }}>
                또래 평균보다 {p.diffPct}% {p.over ? "더 써요" : "적게 써요"}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <div style={{ flex: 1, height: 8, borderRadius: 5, background: "rgba(28,30,29,0.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 5, width: `${p.ratioPct}%`, background: p.over ? "#C1663F" : "#2B5A4C" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11.5, color: "rgba(28,30,29,0.4)" }}>
              <div>내 지출 {won(p.mine)}</div>
              <div>또래 평균 {won(p.avg)}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ margin: "0 20px 100px", background: "#fff", borderRadius: 18, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1E1D", marginBottom: 12 }}>
          이번 주 인기 소비 카테고리 · 전체 사용자
        </div>
        {error && <EmptyText text="비교 데이터를 불러오지 못했어요." />}
        {!error && loading && <EmptyText text="불러오는 중..." />}
        {!error && !loading && popularRows.length === 0 && <EmptyText text="아직 비교할 사용자가 충분하지 않아요." />}
        {popularRows.map((c) => (
          <div key={c.category.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
              <div style={{ color: "#1C1E1D", fontWeight: 600 }}>{c.category.name}</div>
              <div style={{ color: "rgba(28,30,29,0.45)" }}>{c.pct}%</div>
            </div>
            <div style={{ height: 8, borderRadius: 5, background: "rgba(28,30,29,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 5, width: `${Math.min(100, c.pct * 2)}%`, background: c.category.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div style={{ fontSize: 13, color: "rgba(28,30,29,0.4)", textAlign: "center", padding: "12px 0" }}>{text}</div>;
}
