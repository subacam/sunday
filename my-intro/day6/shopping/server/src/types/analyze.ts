export type Platform = "coupang" | "naver";

export type SentimentLabel = "positive" | "neutral" | "negative";

export interface AnalyzeReviewInput {
  index: number;
  text: string;
  rating: number | null;
  date: string | null;
  option: string | null;
}

export interface AnalyzeRequestBody {
  platform: Platform;
  productName: string;
  reviews: AnalyzeReviewInput[];
}

export interface SentimentBreakdown {
  positivePct: number;
  neutralPct: number;
  negativePct: number;
}

export interface ReviewLabel {
  index: number;
  label: SentimentLabel;
  /** ids of keywords (from `keywords[].id`) this review touches on, for excel keyword-tagging */
  keywords: string[];
}

export interface Insights {
  strengths: string[];
  improvements: string[];
}

export interface Keyword {
  id: string;
  label: string;
  weight: number;
}

export interface KeywordRelation {
  source: string;
  target: string;
}

export interface AnalyzeResponseBody {
  sentiment: SentimentBreakdown;
  reviewLabels: ReviewLabel[];
  insights: Insights;
  keywords: Keyword[];
  keywordRelations: KeywordRelation[];
}

export type AnalyzeErrorCode =
  | "INVALID_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "CONFIG_ERROR";

export interface AnalyzeApiError {
  error: AnalyzeErrorCode;
  message: string;
}
