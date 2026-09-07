"use client";

import { categoryById } from "@/lib/categories";
import { formatDateTime } from "@/lib/format";
import { Expense } from "@/types/ledger";

function exportCsv(expenses: Expense[]) {
  const header = ["날짜", "상호명", "카테고리", "금액", "결제수단", "품목"];
  const rows = expenses.map((e) => [
    formatDateTime(e.transactionAt),
    e.merchant,
    categoryById[e.categoryId].name,
    String(e.totalAmount),
    e.paymentMethod,
    e.items.map((it) => `${it.name} x${it.quantity}`).join(" / "),
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `가계부_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function MaiTab({
  email,
  displayName,
  expenses,
  onOpenCategoryBudget,
  onComingSoon,
  onSignOut,
}: {
  email: string;
  displayName: string;
  expenses: Expense[];
  onOpenCategoryBudget: () => void;
  onComingSoon: () => void;
  onSignOut: () => void;
}) {
  return (
    <div>
      <div style={{ padding: "58px 20px 6px" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1C1E1D" }}>마이</div>
      </div>

      <div style={{ margin: "14px 20px", background: "#fff", borderRadius: 18, padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#2B5A4C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 17,
            fontWeight: 700,
          }}
        >
          {displayName.slice(0, 1)}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1E1D" }}>{displayName}님</div>
          <div style={{ fontSize: 12.5, color: "rgba(28,30,29,0.45)", marginTop: 2 }}>{email}</div>
        </div>
      </div>

      <div style={{ margin: "14px 20px 24px", background: "#fff", borderRadius: 18, overflow: "hidden" }}>
        <Row label="카테고리 · 예산 관리" onClick={onOpenCategoryBudget} />
        <Row label="알림 설정" onClick={onComingSoon} />
        <Row label="결제수단 관리" onClick={onComingSoon} />
        <Row label="데이터 내보내기" onClick={() => exportCsv(expenses)} last />
      </div>

      <div style={{ margin: "0 20px 100px", textAlign: "center" }}>
        <div onClick={onSignOut} style={{ fontSize: 13, color: "rgba(28,30,29,0.4)", cursor: "pointer", padding: 12 }}>
          로그아웃
        </div>
      </div>
    </div>
  );
}

function Row({ label, onClick, last }: { label: string; onClick: () => void; last?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px 18px",
        fontSize: 15,
        color: "#1C1E1D",
        borderBottom: last ? undefined : "0.5px solid rgba(28,30,29,0.08)",
        display: "flex",
        justifyContent: "space-between",
        cursor: "pointer",
      }}
    >
      <span>{label}</span>
      <span style={{ color: "rgba(28,30,29,0.3)" }}>›</span>
    </div>
  );
}
