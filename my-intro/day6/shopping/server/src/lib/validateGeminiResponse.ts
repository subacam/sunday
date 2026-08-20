import type { AnalyzeResponseBody, SentimentLabel } from "@/types/analyze";

const SENTIMENT_LABELS: SentimentLabel[] = ["positive", "neutral", "negative"];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === "string");
}

/**
 * Hand-rolled shape check for Gemini's JSON output — no schema-validation
 * library, matching the repo's philosophy of not adding a dependency without
 * a reason stronger than "the general-purpose version is nicer." Only checks
 * shape/type, not semantic correctness (e.g. percentages summing to ~100 is
 * checked loosely, not enforced strictly, since the model may round).
 */
export function validateGeminiResponse(data: unknown): data is AnalyzeResponseBody {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;

  const sentiment = d.sentiment as Record<string, unknown> | undefined;
  if (
    typeof sentiment !== "object" ||
    sentiment === null ||
    !isFiniteNumber(sentiment.positivePct) ||
    !isFiniteNumber(sentiment.neutralPct) ||
    !isFiniteNumber(sentiment.negativePct)
  ) {
    return false;
  }

  if (!Array.isArray(d.reviewLabels)) return false;
  for (const item of d.reviewLabels) {
    if (typeof item !== "object" || item === null) return false;
    const r = item as Record<string, unknown>;
    if (!isFiniteNumber(r.index)) return false;
    if (!SENTIMENT_LABELS.includes(r.label as SentimentLabel)) return false;
    if (!isStringArray(r.keywords ?? [])) return false;
  }

  const insights = d.insights as Record<string, unknown> | undefined;
  if (
    typeof insights !== "object" ||
    insights === null ||
    !isStringArray(insights.strengths) ||
    !isStringArray(insights.improvements)
  ) {
    return false;
  }

  if (!Array.isArray(d.keywords)) return false;
  for (const item of d.keywords) {
    if (typeof item !== "object" || item === null) return false;
    const k = item as Record<string, unknown>;
    if (typeof k.id !== "string" || typeof k.label !== "string" || !isFiniteNumber(k.weight)) {
      return false;
    }
  }

  if (!Array.isArray(d.keywordRelations)) return false;
  for (const item of d.keywordRelations) {
    if (typeof item !== "object" || item === null) return false;
    const rel = item as Record<string, unknown>;
    if (typeof rel.source !== "string" || typeof rel.target !== "string") return false;
  }

  return true;
}
