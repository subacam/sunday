import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";
import { MAX_PRODUCT_NAME_LEN, MAX_REVIEWS, MAX_REVIEW_TEXT_LEN, MIN_REVIEWS } from "@/lib/constants";
import { buildMockResponse } from "@/lib/mockResponse";
import { checkRateLimit, rateLimitKeyFromRequest } from "@/lib/rateLimit";
import { validateGeminiResponse } from "@/lib/validateGeminiResponse";
import type { AnalyzeApiError, AnalyzeRequestBody, AnalyzeReviewInput, Platform } from "@/types/analyze";

// 300개 리뷰 프롬프트는 실제로 25초 타임아웃을 넘겨서 실패한 적이 있다
// (server/CLAUDE.md 참고). Vercel 배포 시 함수 자체의 기본 실행 제한에 걸리지
// 않도록 명시적으로 늘려둔다 — GEMINI_TIMEOUT_MS(50s)보다 여유를 둔 값.
export const maxDuration = 60;

function errorResponse(status: number, body: AnalyzeApiError) {
  return NextResponse.json(body, { status });
}

function isPlatform(v: unknown): v is Platform {
  return v === "coupang" || v === "naver";
}

function sanitizeReviews(raw: unknown): AnalyzeReviewInput[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length < MIN_REVIEWS) return null;

  const capped = raw.slice(0, MAX_REVIEWS);
  const reviews: AnalyzeReviewInput[] = [];

  for (const item of capped) {
    if (typeof item !== "object" || item === null) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.index !== "number" || typeof r.text !== "string" || !r.text.trim()) return null;

    reviews.push({
      index: r.index,
      text: r.text.slice(0, MAX_REVIEW_TEXT_LEN),
      rating: typeof r.rating === "number" ? r.rating : null,
      date: typeof r.date === "string" ? r.date : null,
      option: typeof r.option === "string" ? r.option : null,
    });
  }

  return reviews;
}

export async function POST(request: NextRequest) {
  if (!checkRateLimit(rateLimitKeyFromRequest(request))) {
    return errorResponse(429, {
      error: "RATE_LIMITED",
      message: "요청이 많아 잠시 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
    });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return errorResponse(400, { error: "INVALID_REQUEST", message: "요청 본문이 올바른 JSON이 아닙니다." });
  }

  const body = json as Record<string, unknown>;

  if (!isPlatform(body.platform)) {
    return errorResponse(400, { error: "INVALID_REQUEST", message: "platform 값이 올바르지 않습니다." });
  }

  const productName =
    typeof body.productName === "string" && body.productName.trim()
      ? body.productName.trim().slice(0, MAX_PRODUCT_NAME_LEN)
      : "상품";

  const reviews = sanitizeReviews(body.reviews);
  if (!reviews) {
    return errorResponse(400, {
      error: "INVALID_REQUEST",
      message: `리뷰는 최소 ${MIN_REVIEWS}개 이상이어야 합니다.`,
    });
  }

  const requestBody: AnalyzeRequestBody = { platform: body.platform, productName, reviews };

  if (process.env.MOCK_ANALYSIS === "1") {
    return NextResponse.json(buildMockResponse(requestBody));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[api/analyze] GEMINI_API_KEY is not set");
    return errorResponse(503, {
      error: "CONFIG_ERROR",
      message: "서버 설정 오류입니다. 잠시 후 다시 시도해주세요.",
    });
  }

  const result = await callGemini(requestBody, apiKey);

  if (!result.ok) {
    const statusByKind = { AUTH_ERROR: 502, RATE_LIMITED: 429, UPSTREAM_ERROR: 503 } as const;
    const messageByKind = {
      AUTH_ERROR: "서비스 일시 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      RATE_LIMITED: "요청이 많아 잠시 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
      UPSTREAM_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    } as const;
    return errorResponse(statusByKind[result.kind], {
      error: result.kind,
      message: messageByKind[result.kind],
    });
  }

  if (!validateGeminiResponse(result.data)) {
    console.error("[api/analyze] Gemini response failed shape validation:", JSON.stringify(result.data).slice(0, 500));
    return errorResponse(503, {
      error: "UPSTREAM_ERROR",
      message: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  }

  return NextResponse.json(result.data);
}
