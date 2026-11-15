import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl, AUTH_COOKIE } from "@/lib/server-api";

export async function POST(request: NextRequest) {
  const respond = (payload: unknown, status: number) => NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return respond({ detail: "Sign in as a traveler to plan a trip." }, 401);
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return respond({ detail: "Origin not allowed" }, 403);
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) return respond({ detail: "Request is too large" }, 413);

  let body: string;
  try {
    body = JSON.stringify(await request.json());
  } catch {
    return respond({ detail: "Invalid JSON body" }, 400);
  }
  try {
    const upstream = await fetch(`${apiBaseUrl()}/ai/plan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    });
    const payload: unknown = await upstream.json().catch(() => null);
    return respond(payload ?? { detail: "Trip planning service unavailable" }, upstream.status);
  } catch {
    return respond({ detail: "Trip planning service unavailable" }, 503);
  }
}
