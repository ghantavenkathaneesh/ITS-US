import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl, AUTH_COOKIE } from "@/lib/server-api";

async function forward(request: NextRequest, method: "GET" | "PUT") {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const respond = (payload: unknown, responseStatus: number) => NextResponse.json(payload, {
    status: responseStatus,
    headers: { "Cache-Control": "no-store" },
  });
  if (!token) return respond({ detail: "Not signed in" }, 401);
  if (method === "PUT" && request.headers.get("origin") !== new URL(request.url).origin) {
    return respond({ detail: "Origin not allowed" }, 403);
  }

  let body: string | undefined;
  if (method === "PUT") {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      return respond({ detail: "Invalid JSON body" }, 400);
    }
  }
  try {
    const upstream = await fetch(`${apiBaseUrl()}/guides/me/profile`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body } : {}),
      cache: "no-store",
    });
    const payload: unknown = await upstream.json().catch(() => null);
    return respond(payload ?? { detail: "Guide service unavailable" }, upstream.status);
  } catch {
    return respond({ detail: "Guide service unavailable" }, 503);
  }
}

export async function GET(request: NextRequest) {
  return forward(request, "GET");
}

export async function PUT(request: NextRequest) {
  return forward(request, "PUT");
}
