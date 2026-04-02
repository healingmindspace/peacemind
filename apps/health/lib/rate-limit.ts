import { NextResponse } from "next/server";

const rateLimits = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = 60 * 60 * 1000
): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.reset) {
    rateLimits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function rateLimitResponse() {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 }
  );
}

export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Rate limit configs per route category
export const RATE_LIMITS = {
  ai: { limit: 20, windowMs: 60 * 60 * 1000 },        // AI generation: 20/hr
  aiHeavy: { limit: 10, windowMs: 60 * 60 * 1000 },    // Heavy AI (summaries, reviews): 10/hr
  aiLight: { limit: 5, windowMs: 60 * 60 * 1000 },      // Light AI (goal review): 5/hr
  crud: { limit: 100, windowMs: 60 * 60 * 1000 },       // CRUD operations: 100/hr
  auth: { limit: 20, windowMs: 60 * 60 * 1000 },        // Auth-related: 20/hr
} as const;
