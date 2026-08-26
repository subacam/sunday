import { supabase, RECEIPT_BUCKET } from "@/lib/supabase";
import { CategoryId, Expense, ExpenseItem } from "@/types/ledger";

interface ExpenseRow {
  id: string;
  merchant_name: string;
  category_id: CategoryId;
  total_amount: number;
  payment_method: string | null;
  memo: string | null;
  transaction_at: string;
  receipt_image_path: string | null;
  is_edited: boolean;
  ledger_expense_items: { id: string; name: string; quantity: number; unit_price: number }[];
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    merchant: row.merchant_name,
    categoryId: row.category_id,
    totalAmount: row.total_amount,
    paymentMethod: row.payment_method ?? "",
    memo: row.memo,
    transactionAt: row.transaction_at,
    receiptImagePath: row.receipt_image_path,
    isEdited: row.is_edited,
    items: row.ledger_expense_items.map((it) => ({
      id: it.id,
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.unit_price,
    })),
  };
}

export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("ledger_expenses")
    .select("*, ledger_expense_items(*)")
    .order("transaction_at", { ascending: false });
  if (error) throw error;
  return (data as ExpenseRow[]).map(mapExpense);
}

export async function createExpense(params: {
  userId: string;
  merchant: string;
  categoryId: CategoryId;
  totalAmount: number;
  paymentMethod: string;
  transactionAt: string;
  receiptImagePath: string | null;
  items: ExpenseItem[];
  isEdited: boolean;
  memo?: string | null;
}): Promise<Expense> {
  const { data: expenseRow, error } = await supabase
    .from("ledger_expenses")
    .insert({
      user_id: params.userId,
      merchant_name: params.merchant,
      category_id: params.categoryId,
      total_amount: params.totalAmount,
      payment_method: params.paymentMethod,
      transaction_at: params.transactionAt,
      receipt_image_path: params.receiptImagePath,
      is_edited: params.isEdited,
      memo: params.memo || null,
    })
    .select()
    .single();
  if (error) throw error;

  if (params.items.length > 0) {
    const { error: itemsError } = await supabase.from("ledger_expense_items").insert(
      params.items.map((it) => ({
        expense_id: expenseRow.id,
        name: it.name,
        quantity: it.quantity,
        unit_price: it.unitPrice,
      }))
    );
    if (itemsError) throw itemsError;
  }

  return {
    id: expenseRow.id,
    merchant: expenseRow.merchant_name,
    categoryId: expenseRow.category_id,
    totalAmount: expenseRow.total_amount,
    paymentMethod: expenseRow.payment_method ?? "",
    memo: expenseRow.memo ?? null,
    transactionAt: expenseRow.transaction_at,
    receiptImagePath: expenseRow.receipt_image_path,
    isEdited: expenseRow.is_edited,
    items: params.items,
  };
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("ledger_expenses").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadReceiptImage(userId: string, file: File | Blob, ext: string): Promise<string> {
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(RECEIPT_BUCKET).upload(path, file, {
    contentType: file instanceof File ? file.type : "image/jpeg",
  });
  if (error) throw error;
  return path;
}

export async function getReceiptSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}

export interface BudgetRow {
  categoryId: CategoryId;
  monthlyAmount: number;
}

export async function listBudgets(): Promise<BudgetRow[]> {
  const { data, error } = await supabase.from("ledger_budgets").select("category_id, monthly_amount");
  if (error) throw error;
  return data.map((r) => ({ categoryId: r.category_id, monthlyAmount: r.monthly_amount }));
}

export async function upsertBudget(userId: string, categoryId: CategoryId, monthlyAmount: number) {
  const { error } = await supabase
    .from("ledger_budgets")
    .upsert({ user_id: userId, category_id: categoryId, monthly_amount: monthlyAmount }, { onConflict: "user_id,category_id" });
  if (error) throw error;
}

export interface CategoryTotal {
  categoryId: CategoryId;
  totalAmount: number;
  userCount: number;
}

export async function getCategoryTotals(sinceISO: string): Promise<CategoryTotal[]> {
  const { data, error } = await supabase.rpc("ledger_category_totals", { since: sinceISO });
  if (error) throw error;
  return (data as { category_id: CategoryId; total_amount: number; user_count: number }[]).map((r) => ({
    categoryId: r.category_id,
    totalAmount: r.total_amount,
    userCount: r.user_count,
  }));
}

export async function getProfile(userId: string): Promise<{ onboardingSeen: boolean } | null> {
  const { data, error } = await supabase.from("ledger_profiles").select("onboarding_seen").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { onboardingSeen: data.onboarding_seen };
}

export async function upsertProfile(userId: string, onboardingSeen: boolean) {
  const { error } = await supabase.from("ledger_profiles").upsert({ id: userId, onboarding_seen: onboardingSeen });
  if (error) throw error;
}
