"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AuthScreen from "@/components/AuthScreen";
import CaptureOverlay from "@/components/CaptureOverlay";
import CategoryBudgetOverlay from "@/components/CategoryBudgetOverlay";
import DashboardTab from "@/components/DashboardTab";
import DetailOverlay from "@/components/DetailOverlay";
import FeedTab from "@/components/FeedTab";
import LoadingOverlay from "@/components/LoadingOverlay";
import MaiTab from "@/components/MaiTab";
import Onboarding from "@/components/Onboarding";
import ReviewOverlay from "@/components/ReviewOverlay";
import TabBar from "@/components/TabBar";
import Toast from "@/components/Toast";
import TrendTab from "@/components/TrendTab";
import { CATEGORIES } from "@/lib/categories";
import { fileToBase64 } from "@/lib/capture";
import {
  BudgetRow,
  createExpense,
  deleteExpense,
  listBudgets,
  listExpenses,
  upsertBudget,
  upsertProfile,
  uploadReceiptImage,
} from "@/lib/ledgerApi";
import { RECEIPT_VISION_FUNCTION_URL, supabase } from "@/lib/supabase";
import { AppScreen, CategoryId, Expense, ReceiptDraft, TabId } from "@/types/ledger";

const ONBOARDING_KEY = "ledger_onboarding_seen";

type Phase = "boot" | "onboarding" | "auth" | "app";

export default function Page() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [user, setUser] = useState<User | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);

  const [tab, setTab] = useState<TabId>("feed");
  const [overlay, setOverlay] = useState<AppScreen>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [reviewDraft, setReviewDraft] = useState<ReceiptDraft | null>(null);
  const [capturePreviewUrl, setCapturePreviewUrl] = useState<string | null>(null);
  const captureBlobRef = useRef<Blob | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAppData = useCallback(async (userId: string) => {
    upsertProfile(userId, true).catch(() => {});
    try {
      const [exp, bud] = await Promise.all([listExpenses(), listBudgets()]);
      setExpenses(exp);
      setBudgets(bud);
    } catch {
      showToast("데이터를 불러오지 못했어요.");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
        setPhase("app");
        loadAppData(data.session.user.id);
      } else {
        const seen = typeof window !== "undefined" && window.localStorage.getItem(ONBOARDING_KEY);
        setPhase(seen ? "auth" : "onboarding");
      }
    });
  }, [loadAppData]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  function handleOnboardingContinue() {
    if (typeof window !== "undefined") window.localStorage.setItem(ONBOARDING_KEY, "1");
    setPhase("auth");
  }

  async function handleAuthed() {
    if (typeof window !== "undefined") window.localStorage.setItem(ONBOARDING_KEY, "1");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    setUser(data.user);
    setPhase("app");
    loadAppData(data.user.id);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setExpenses([]);
    setBudgets([]);
    setTab("feed");
    setPhase("auth");
  }

  function closeOverlay() {
    if (capturePreviewUrl) URL.revokeObjectURL(capturePreviewUrl);
    setCapturePreviewUrl(null);
    captureBlobRef.current = null;
    setReviewDraft(null);
    setOverlay(null);
  }

  async function handleCaptured(blob: Blob, mimeType: string) {
    captureBlobRef.current = blob;
    const url = URL.createObjectURL(blob);
    setCapturePreviewUrl(url);
    setOverlay("loading");

    try {
      const [base64, sessionRes] = await Promise.all([fileToBase64(blob), supabase.auth.getSession()]);
      const accessToken = sessionRes.data.session?.access_token;

      const res = await fetch(RECEIPT_VISION_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      if (!res.ok) throw new Error("analysis_failed");
      const result = await res.json();

      const categoryId: CategoryId = CATEGORIES.some((c) => c.id === result.categoryId) ? result.categoryId : "etc";
      const parsedDate = new Date(result.transactionDate);
      const transactionAt = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
      const items = Array.isArray(result.items) && result.items.length > 0
        ? result.items.map((it: { name?: string; quantity?: number; unitPrice?: number }) => ({
            name: it.name || "품목",
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
          }))
        : [{ name: "지출", quantity: 1, unitPrice: Number(result.totalAmount) || 0 }];

      setReviewDraft({
        merchant: String(result.merchant || "알 수 없음"),
        transactionAt,
        totalAmount: Number(result.totalAmount) || 0,
        paymentMethod: String(result.paymentMethodGuess || ""),
        categoryId,
        items,
        lowConfidenceFields: Array.isArray(result.lowConfidenceFields) ? result.lowConfidenceFields : [],
        fallback: Boolean(result.fallback),
      });
      setOverlay("review");
    } catch {
      showToast("영수증 분석에 실패했어요. 다시 시도해주세요.");
      closeOverlay();
    }
  }

  function handleRetake() {
    if (capturePreviewUrl) URL.revokeObjectURL(capturePreviewUrl);
    setCapturePreviewUrl(null);
    captureBlobRef.current = null;
    setReviewDraft(null);
    setOverlay("capture");
  }

  async function handleSaveExpense(finalDraft: ReceiptDraft, memo: string) {
    if (!user) return;
    setSaving(true);
    try {
      let receiptImagePath: string | null = null;
      const blob = captureBlobRef.current;
      if (blob) {
        const ext = blob.type.includes("png") ? "png" : "jpg";
        receiptImagePath = await uploadReceiptImage(user.id, blob, ext);
      }
      const created = await createExpense({
        userId: user.id,
        merchant: finalDraft.merchant,
        categoryId: finalDraft.categoryId,
        totalAmount: finalDraft.totalAmount,
        paymentMethod: finalDraft.paymentMethod,
        transactionAt: finalDraft.transactionAt,
        receiptImagePath,
        items: finalDraft.items,
        isEdited: true,
        memo,
      });
      setExpenses((prev) => [created, ...prev]);
      setTab("feed");
      closeOverlay();
      showToast("저장되었습니다");
    } catch {
      showToast("저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  function openDetail(id: string) {
    setSelectedExpenseId(id);
    setOverlay("detail");
  }

  async function handleDeleteExpense(id: string) {
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      setOverlay(null);
      showToast("삭제되었습니다");
    } catch {
      showToast("삭제에 실패했어요.");
    }
  }

  async function handleSaveBudget(categoryId: CategoryId, amount: number) {
    if (!user) return;
    await upsertBudget(user.id, categoryId, amount);
    setBudgets((prev) => {
      const next = prev.filter((b) => b.categoryId !== categoryId);
      next.push({ categoryId, monthlyAmount: amount });
      return next;
    });
  }

  if (phase === "boot") {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EDEAE4" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#2B5A4C" }} />
      </div>
    );
  }

  if (phase === "onboarding") {
    return (
      <div style={{ height: "100dvh", maxWidth: 480, margin: "0 auto" }}>
        <Onboarding onContinue={handleOnboardingContinue} />
      </div>
    );
  }

  if (phase === "auth") {
    return (
      <div style={{ height: "100dvh", maxWidth: 480, margin: "0 auto" }}>
        <AuthScreen onAuthed={handleAuthed} />
      </div>
    );
  }

  const selectedExpense = expenses.find((e) => e.id === selectedExpenseId) ?? null;
  const displayName = user?.email?.split("@")[0] ?? "회원";

  return (
    <div style={{ position: "relative", maxWidth: 480, margin: "0 auto", minHeight: "100dvh", background: "#EDEAE4" }}>
      {tab === "feed" && <FeedTab displayName={displayName} expenses={expenses} onOpenDetail={openDetail} />}
      {tab === "trend" && <TrendTab expenses={expenses} />}
      {tab === "dashboard" && <DashboardTab expenses={expenses} budgets={budgets} />}
      {tab === "mai" && (
        <MaiTab
          email={user?.email ?? ""}
          displayName={displayName}
          expenses={expenses}
          onOpenCategoryBudget={() => setOverlay("categoryBudget")}
          onComingSoon={() => showToast("아직 준비 중인 기능이에요")}
          onSignOut={handleSignOut}
        />
      )}

      <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 0, width: "100%", maxWidth: 480, zIndex: 30 }}>
        <TabBar tab={tab} onSelect={setTab} onCapture={() => setOverlay("capture")} />
      </div>

      {toast && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 0, width: "100%", maxWidth: 480, zIndex: 40 }}>
          <Toast message={toast} />
        </div>
      )}

      {overlay && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#EDEAE4" }}>
          {overlay === "capture" && <CaptureOverlay onClose={closeOverlay} onCaptured={handleCaptured} />}
          {overlay === "loading" && <LoadingOverlay />}
          {overlay === "review" && reviewDraft && (
            <ReviewOverlay draft={reviewDraft} imagePreviewUrl={capturePreviewUrl} saving={saving} onRetake={handleRetake} onSave={handleSaveExpense} />
          )}
          {overlay === "detail" && selectedExpense && (
            <DetailOverlay expense={selectedExpense} onClose={() => setOverlay(null)} onDelete={handleDeleteExpense} />
          )}
          {overlay === "categoryBudget" && (
            <CategoryBudgetOverlay
              budgets={budgets}
              onSave={handleSaveBudget}
              onClose={() => setOverlay(null)}
              onUnsupported={() => showToast("카테고리는 8종으로 고정되어 있어요")}
            />
          )}
        </div>
      )}
    </div>
  );
}
