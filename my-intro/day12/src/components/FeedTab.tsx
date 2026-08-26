"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, categoryById } from "@/lib/categories";
import { feedGroupLabel, won } from "@/lib/format";
import { monthChangePct } from "@/lib/stats";
import { CategoryId, Expense } from "@/types/ledger";

export default function FeedTab({
  displayName,
  expenses,
  onOpenDetail,
}: {
  displayName: string;
  expenses: Expense[];
  onOpenDetail: (id: string) => void;
}) {
  const [filter, setFilter] = useState<CategoryId | "all">("all");

  const presentCategories = useMemo(() => {
    const ids = new Set(expenses.map((e) => e.categoryId));
    return CATEGORIES.filter((c) => ids.has(c.id));
  }, [expenses]);

  const filtered = filter === "all" ? expenses : expenses.filter((e) => e.categoryId === filter);

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const label = feedGroupLabel(e.transactionAt);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(e);
    }
    return [...map.entries()].map(([label, items]) => ({
      label,
      items,
      subtotal: items.reduce((a, i) => a + i.totalAmount, 0),
    }));
  }, [filtered]);

  const { thisMonthTotal, pct } = monthChangePct(expenses);
  const monthNum = new Date().getMonth() + 1;

  return (
    <div>
      <div style={{ padding: "58px 20px 12px" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1C1E1D" }}>안녕하세요, {displayName}님</div>
        <div style={{ fontSize: 14, color: "rgba(28,30,29,0.5)", marginTop: 4 }}>오늘도 지출을 잘 챙겨봐요</div>
      </div>

      <div style={{ margin: "8px 20px 18px", background: "#1C1E1D", borderRadius: 20, padding: 20, color: "#fff" }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{monthNum}월 총 지출</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{won(thisMonthTotal)}</div>
          {pct !== 0 && (
            <div style={{ fontSize: 13, color: "#E7A94E", fontWeight: 600 }}>
              {pct >= 0 ? "+" : ""}
              {pct}%
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 20px 16px", overflowX: "auto" }}>
        <FilterChip label="전체" active={filter === "all"} onClick={() => setFilter("all")} />
        {presentCategories.map((c) => (
          <FilterChip key={c.id} label={c.name} active={filter === c.id} onClick={() => setFilter(c.id)} />
        ))}
      </div>

      <div style={{ padding: "0 20px 100px" }}>
        {groups.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(28,30,29,0.4)", fontSize: 14 }}>
            아직 기록된 지출이 없어요.
            <br />
            아래 촬영 버튼으로 첫 영수증을 등록해보세요.
          </div>
        )}
        {groups.map((grp) => (
          <div key={grp.label} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(28,30,29,0.45)" }}>{grp.label}</div>
              <div style={{ fontSize: 13, color: "rgba(28,30,29,0.4)" }}>{won(grp.subtotal)}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden" }}>
              {grp.items.map((it, idx) => {
                const c = categoryById[it.categoryId];
                return (
                  <div
                    key={it.id}
                    onClick={() => onOpenDetail(it.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      cursor: "pointer",
                      borderBottom: idx < grp.items.length - 1 ? "0.5px solid rgba(28,30,29,0.08)" : undefined,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: c.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {c.short}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#1C1E1D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {it.merchant}
                      </div>
                      <div style={{ fontSize: 12.5, color: "rgba(28,30,29,0.45)", marginTop: 2 }}>
                        {c.name} · {it.paymentMethod}
                      </div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1E1D", flexShrink: 0 }}>{won(it.totalAmount)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 100,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: active ? "#1C1E1D" : "#fff",
        color: active ? "#fff" : "#1C1E1D",
        flexShrink: 0,
        cursor: "pointer",
      }}
    >
      {label}
    </div>
  );
}
