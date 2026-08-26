"use client";

import { categoryById } from "@/lib/categories";
import { formatDateTime, won } from "@/lib/format";
import { Expense } from "@/types/ledger";

export default function DetailOverlay({
  expense,
  onClose,
  onDelete,
}: {
  expense: Expense;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const c = categoryById[expense.categoryId];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#EDEAE4" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "58px 20px 10px" }}>
        <div onClick={onClose} style={{ fontSize: 20, color: "#1C1E1D", cursor: "pointer" }}>
          ‹
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1E1D" }}>지출 상세</div>
        <div onClick={() => onDelete(expense.id)} style={{ fontSize: 13, color: "#C1663F", cursor: "pointer" }}>
          삭제
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 20px 24px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, marginBottom: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              background: c.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {c.short}
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#1C1E1D" }}>{expense.merchant}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1C1E1D" }}>{won(expense.totalAmount)}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: "4px 16px", marginBottom: 14 }}>
          <DetailRow label="카테고리" value={c.name} />
          <DetailRow label="일시" value={formatDateTime(expense.transactionAt)} />
          <DetailRow label="결제 수단" value={expense.paymentMethod || "-"} last />
        </div>
        {expense.memo && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, fontSize: 14, color: "#1C1E1D" }}>
            {expense.memo}
          </div>
        )}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13, color: "rgba(28,30,29,0.5)", marginBottom: 10 }}>품목</div>
          {expense.items.map((it, i) => (
            <div key={it.id ?? i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "6px 0" }}>
              <div style={{ color: "#1C1E1D" }}>
                {it.name} × {it.quantity}
              </div>
              <div style={{ color: "#1C1E1D", fontWeight: 600 }}>{won(it.unitPrice * it.quantity)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: last ? undefined : "0.5px solid rgba(28,30,29,0.08)" }}>
      <div style={{ fontSize: 13, color: "rgba(28,30,29,0.5)" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1C1E1D" }}>{value}</div>
    </div>
  );
}
