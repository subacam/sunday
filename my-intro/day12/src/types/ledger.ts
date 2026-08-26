export type CategoryId =
  | "food"
  | "cafe"
  | "transport"
  | "shopping"
  | "health"
  | "culture"
  | "living"
  | "etc";

export interface Category {
  id: CategoryId;
  name: string;
  short: string;
  color: string;
}

export interface ExpenseItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Expense {
  id: string;
  merchant: string;
  categoryId: CategoryId;
  totalAmount: number;
  paymentMethod: string;
  memo: string | null;
  transactionAt: string; // ISO timestamp
  receiptImagePath: string | null;
  isEdited: boolean;
  items: ExpenseItem[];
}

export interface Budget {
  categoryId: CategoryId;
  monthlyAmount: number;
}

export interface ReceiptDraft {
  merchant: string;
  transactionAt: string;
  totalAmount: number;
  paymentMethod: string;
  categoryId: CategoryId;
  items: ExpenseItem[];
  lowConfidenceFields: string[];
  fallback?: boolean;
}

export type AppScreen =
  | "capture"
  | "loading"
  | "review"
  | "detail"
  | "categoryBudget"
  | null;

export type TabId = "feed" | "trend" | "dashboard" | "mai";
