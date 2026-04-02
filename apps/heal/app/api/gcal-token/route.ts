import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`gcal-token:${ip}`, RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs)) {
    return rateLimitResponse();
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = body.code ? String(body.code).slice(0, 2000) : undefined;
  const redirectUri = body.redirectUri ? String(body.redirectUri).slice(0, 2000) : undefined;
  const codeVerifier = body.codeVerifier ? String(body.codeVerifier).slice(0, 2000) : undefined;
  const refreshToken = body.refreshToken ? String(body.refreshToken).slice(0, 2000) : undefined;

  const params: Record<string, string> = {
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
  };

  if (refreshToken) {
    // Refresh token flow
    params.grant_type = "refresh_token";
    params.refresh_token = refreshToken;
  } else if (code) {
    // Authorization code exchange
    params.grant_type = "authorization_code";
    params.code = code;
    params.redirect_uri = redirectUri || "";
    if (codeVerifier) params.code_verifier = codeVerifier;
  } else {
    return NextResponse.json({ error: "Missing code or refreshToken" }, { status: 400 });
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.error || "Token exchange failed" }, { status: res.status });
  }

  return NextResponse.json(data);
}
