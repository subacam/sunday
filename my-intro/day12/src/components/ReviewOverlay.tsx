"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, categoryById } from "@/lib/categories";
import { won } from "@/lib/format";
import { CategoryId, ExpenseItem, ReceiptDraft } from "@/types/ledger";

function toDatetimeLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReviewOverlay({
  draft,
  imagePreviewUrl,
  saving,
  onRetake,
  onSave,
}: {
  draft: ReceiptDraft;
  imagePreviewUrl: string | null;
  saving: boolean;
  onRetake: () => void;
  onSave: (finalDraft: ReceiptDraft, memo: string) => void;
}) {
  const [merchant, setMerchant] = useState(draft.merchant);
  const [transactionAt, setTransactionAt] = useState(draft.transactionAt);
  const [categoryId, setCategoryId] = useState<CategoryId>(draft.categoryId);
  const [totalAmount, setTotalAmount] = useState(String(draft.totalAmount));
  const [paymentMethod, setPaymentMethod] = useState(draft.paymentMethod);
  const [items, setItems] = useState<ExpenseItem[]>(draft.items);
  const [memo, setMemo] = useState("");
  const [showMemoInput, setShowMemoInput] = useState(false);

  const cat = categoryById[categoryId];
  const lowConf = new Set(draft.lowConfidenceFields);

  const itemsTotal = useMemo(() => items.reduce((a, it) => a + it.quantity * it.unitPrice, 0), [items]);
  const totalNum = Number(totalAmount.replace(/[^0-9]/g, "")) || 0;
  const mismatch = items.length > 0 && itemsTotal !== totalNum;

  function updateItem(idx: number, patch: Partial<ExpenseItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function addItem() {
    setItems((prev) => [...prev, { name: "새 품목", quantity: 1, unitPrice: 0 }]);
  }

  function handleSave() {
    onSave(
      {
        merchant,
        transactionAt: new Date(transactionAt).toISOString(),
        categoryId,
        totalAmount: totalNum,
        paymentMethod,
        items,
        lowConfidenceFields: draft.lowConfidenceFields,
      },
      memo
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#EDEAE4" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "58px 20px 10px" }}>
        <div onClick={onRetake} style={{ fontSize: 20, color: "#1C1E1D", cursor: "pointer" }}>
          ‹
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1E1D" }}>확인 및 수정</div>
        <div style={{ width: 20 }} />
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 20px 24px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
          {imagePreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreviewUrl} alt="영수증 원본" style={{ width: 52, height: 68, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 68, borderRadius: 8, background: "#e6e2d8", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, fontSize: 12.5, color: "rgba(28,30,29,0.5)", lineHeight: 1.5 }}>
            원본 영수증 이미지
            <br />
            탭하면 확대해서 볼 수 있어요
            {draft.fallback && (
              <>
                <br />
                <span style={{ color: "#9A6B1E" }}>AI 인식이 불안정해 임시값으로 채웠어요. 값을 확인해주세요.</span>
              </>
            )}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: "4px 16px" }}>
          <Field label="상호명" highlight={lowConf.has("merchant")}>
            <input value={merchant} onChange={(e) => setMerchant(e.target.value)} style={fieldInputStyle} />
          </Field>
          <Field label="날짜" highlight={lowConf.has("transactionDate")}>
            <input
              type="datetime-local"
              value={toDatetimeLocal(transactionAt)}
              onChange={(e) => setTransactionAt(e.target.value)}
              style={fieldInputStyle}
            />
          </Field>
          <Field label="카테고리">
            <div style={{ position: "relative", display: "inline-flex" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                  padding: "5px 12px",
                  borderRadius: 100,
                  background: cat.color,
                }}
              >
                {cat.name}
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value as CategoryId)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="총 금액" highlight={lowConf.has("totalAmount")}>
            <input
              inputMode="numeric"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              style={{ ...fieldInputStyle, fontSize: 17, fontWeight: 700, textAlign: "right" }}
            />
          </Field>
          <Field label="결제 수단" last>
            <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={fieldInputStyle} />
          </Field>
        </div>

        <div style={{ marginTop: 14, background: "#fff", borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13, color: "rgba(28,30,29,0.5)", marginBottom: 10 }}>품목</div>
          {items.map((it, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
              <input
                value={it.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
                style={{ ...fieldInputStyle, flex: 1, textAlign: "left" }}
              />
              <input
                inputMode="numeric"
                value={it.quantity}
                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })}
                style={{ ...fieldInputStyle, width: 40, textAlign: "center" }}
              />
              <input
                inputMode="numeric"
                value={it.unitPrice}
                onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })}
                style={{ ...fieldInputStyle, width: 80, textAlign: "right" }}
              />
              <div onClick={() => removeItem(idx)} style={{ color: "rgba(28,30,29,0.35)", cursor: "pointer", padding: "0 4px" }}>
                ✕
              </div>
            </div>
          ))}
          <div onClick={addItem} style={{ fontSize: 13, color: "#2B5A4C", fontWeight: 600, cursor: "pointer", padding: "8px 0 2px" }}>
            + 품목 추가
          </div>
          {mismatch && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#9A6B1E" }}>
              품목 합계({won(itemsTotal)})가 총 금액({won(totalNum)})과 달라요.
            </div>
          )}
        </div>

        {showMemoInput ? (
          <input
            autoFocus
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모"
            style={{
              marginTop: 14,
              width: "100%",
              background: "#fff",
              borderRadius: 16,
              padding: "14px 16px",
              fontSize: 14,
              color: "#1C1E1D",
              border: "none",
              boxSizing: "border-box",
            }}
          />
        ) : (
          <div
            onClick={() => setShowMemoInput(true)}
            style={{ marginTop: 14, background: "#fff", borderRadius: 16, padding: "14px 16px", fontSize: 14, color: "rgba(28,30,29,0.4)", cursor: "pointer" }}
          >
            메모 추가하기
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, padding: "12px 20px 40px", background: "#EDEAE4" }}>
        <div
          onClick={onRetake}
          style={{ flex: 1, height: 52, borderRadius: 14, background: "#fff", color: "#1C1E1D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
        >
          다시 촬영
        </div>
        <div
          onClick={saving ? undefined : handleSave}
          style={{
            flex: 2,
            height: 52,
            borderRadius: 14,
            background: "#2B5A4C",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "저장 중..." : "저장"}
        </div>
      </div>
    </div>
  );
}

function Field({ label, highlight, last, children }: { label: string; highlight?: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 0",
        borderBottom: last ? undefined : "0.5px solid rgba(28,30,29,0.08)",
        background: highlight ? "#FBF3E4" : undefined,
        margin: highlight ? "0 -16px" : undefined,
        paddingLeft: highlight ? 16 : undefined,
        paddingRight: highlight ? 16 : undefined,
      }}
    >
      <div style={{ fontSize: 13, color: highlight ? "#9A6B1E" : "rgba(28,30,29,0.5)", fontWeight: highlight ? 600 : 400 }}>
        {label}
        {highlight ? " · 확인 필요" : ""}
      </div>
      {children}
    </div>
  );
}

const fieldInputStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#1C1E1D",
  border: "none",
  background: "transparent",
  outline: "none",
  textAlign: "right",
  padding: 0,
};
