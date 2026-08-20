export const MIN_REVIEWS = 5;
export const MAX_REVIEWS = 300;
export const MAX_REVIEW_TEXT_LEN = 1000;
export const MAX_PRODUCT_NAME_LEN = 200;

/**
 * "Gemini 3.0 flash" per the PRD. Model id / endpoint / `responseSchema` support
 * unverified against current Google AI docs as of implementation time — re-check
 * before relying on this in production (same posture as day6/dust's AirKorea
 * station-name gotcha: written down as a known-unverified assumption, not fact).
 */
export const GEMINI_MODEL = "gemini-flash-latest";
export const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const GEMINI_TIMEOUT_MS = 50000;

/** best-effort in-memory rate limit — see lib/rateLimit.ts */
export const RATE_LIMIT_MAX_REQUESTS = 10;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
