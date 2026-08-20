import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from "./constants";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Best-effort only: resets on cold start and is not shared across concurrent
 * serverless instances, so it does not enforce a hard global cap. Kept simple
 * on purpose for a free, personal-scale project — see server/CLAUDE.md
 * "Not built yet" for the durable (Vercel KV) version this should become
 * before any real public launch.
 */
const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function rateLimitKeyFromRequest(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}
