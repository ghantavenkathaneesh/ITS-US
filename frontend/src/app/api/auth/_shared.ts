import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl, AUTH_COOKIE } from "@/lib/server-api";
import type { User } from "@/types/user";

type AuthResult = { access_token: string; expires_in: number; user: User };

function jsonResponse(payload: unknown, init?: { status?: number }): NextResponse {
  const response = NextResponse.json(payload, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === "string"
    && typeof user.display_name === "string"
    && typeof user.email === "string"
    && typeof user.created_at === "string"
    && ["traveler", "guide", "admin"].includes(String(user.role));
}

function isAuthResult(value: unknown): value is AuthResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return typeof result.access_token === "string"
    && typeof result.expires_in === "number"
    && result.expires_in > 0
    && isUser(result.user);
}

function sameOrigin(request: NextRequest): boolean {
  return request.headers.get("origin") === new URL(request.url).origin;
}

export async function authenticate(request: NextRequest, action: "register" | "login"): Promise<NextResponse> {
  if (!sameOrigin(request)) return jsonResponse({ detail: "Origin not allowed" }, { status: 403 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ detail: "Invalid JSON body" }, { status: 400 });
  }
  try {
    const upstream = await fetch(`${apiBaseUrl()}/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const result: unknown = await upstream.json().catch(() => null);
    if (!upstream.ok) return jsonResponse(result ?? { detail: "Authentication failed" }, { status: upstream.status });
    if (!isAuthResult(result)) return jsonResponse({ detail: "Invalid API response" }, { status: 502 });
    const response = jsonResponse({ user: result.user });
    response.cookies.set(AUTH_COOKIE, result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.min(result.expires_in, 86400),
    });
    return response;
  } catch {
    return jsonResponse({ detail: "Account service unavailable" }, { status: 503 });
  }
}

