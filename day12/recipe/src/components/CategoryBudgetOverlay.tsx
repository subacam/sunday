"use client";

import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { won } from "@/lib/format";
import { BudgetRow } from "@/lib/ledgerApi";
import { CategoryId } from "@/types/ledger";

export default function CategoryBudgetOverlay({
  budgets,
  onSave,
  onClose,
  onUnsupported,
}: {
  budgets: BudgetRow[];
  onSave: (categoryId: CategoryId, amount: number) => Promise<void>;
  onClose: () => void;
  onUnsupported: () => void;
}) {
  const [editing, setEditing] = useState<CategoryId | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const budgetByCategory = new Map(budgets.map((b) => [b.categoryId, b.monthlyAmount]));

  async function handleSave(categoryId: CategoryId) {
    const amount = Number(draft.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(amount) || amount < 0) return;
    setSaving(true);
    await onSave(categoryId, amount);
    setSaving(false);
    setEditing(null);
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#EDEAE4" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "58px 20px 10px" }}>
        <div onClick={onClose} style={{ fontSize: 20, color: "#1C1E1D", cursor: "pointer" }}>
          ‹
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1E1D" }}>카테고리 · 예산</div>
        <div style={{ width: 20 }} />
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 20px 24px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "4px 16px" }}>
          {CATEGORIES.map((c, i) => {
            const budget = budgetByCategory.get(c.id);
            const isEditing = editing === c.id;
            return (
              <div key={c.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "13px 0",
                    borderBottom: i < CATEGORIES.length - 1 ? "0.5px solid rgba(28,30,29,0.08)" : undefined,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    if (isEditing) return;
                    setEditing(c.id);
                    setDraft(budget ? String(budget) : "");
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: c.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {c.short}
                  </div>
                  <div style={{ flex: 1, fontSize: 14.5, color: "#1C1E1D", fontWeight: 600 }}>{c.name}</div>
                  {!isEditing && (
                    <div style={{ fontSize: 13, color: "rgba(28,30,29,0.45)" }}>
                      {budget ? `${won(budget)} 예산` : "예산 미설정"}
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div style={{ display: "flex", gap: 8, padding: "0 0 14px" }}>
                    <input
                      autoFocus
                      inputMode="numeric"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="월 예산 (원)"
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1.5px solid rgba(28,30,29,0.12)",
                        fontSize: 14,
                      }}
                    />
                    <button
                      disabled={saving}
                      onClick={() => handleSave(c.id)}
                      style={{
                        padding: "0 16px",
                        borderRadius: 10,
                        border: "none",
                        background: "#2B5A4C",
                        color: "#fff",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      저장
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div
          onClick={onUnsupported}
          style={{
            marginTop: 16,
            height: 50,
            borderRadius: 14,
            border: "1.5px dashed rgba(28,30,29,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "rgba(28,30,29,0.5)",
            cursor: "pointer",
          }}
        >
          + 카테고리 추가
        </div>
      </div>
    </div>
  );
}
