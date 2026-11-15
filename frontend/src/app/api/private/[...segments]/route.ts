import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl, AUTH_COOKIE } from "@/lib/server-api";

const objectId = /^[0-9a-fA-F]{24}$/;
const conversationId = /^[0-9a-f]{64}$/;

function allowed(segments: string[], method: string): boolean {
  if (segments.length === 2 && segments[0] === "admin" && ["guides", "places"].includes(segments[1])) return method === "GET";
  if (segments.length === 4 && segments[0] === "admin" && segments[1] === "cities"
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segments[2]) && segments[3] === "places") return method === "POST";
  if (segments.length === 3 && segments[0] === "admin" && segments[1] === "guides"
    && objectId.test(segments[2])) return method === "PATCH";
  if (segments.length === 3 && segments[0] === "admin" && segments[1] === "places"
    && objectId.test(segments[2])) return method === "PUT";
  if (segments.length === 4 && segments[0] === "admin" && ["guides", "places"].includes(segments[1])
    && objectId.test(segments[2]) && segments[3] === "status") return method === "PATCH";
  if (segments.length === 1 && segments[0] === "trips") return ["GET", "POST"].includes(method);
  if (segments.length === 2 && segments[0] === "trips" && objectId.test(segments[1])) {
    return ["GET", "PUT", "DELETE"].includes(method);
  }
  if (segments.length === 1 && segments[0] === "bookings") return ["GET", "POST"].includes(method);
  if (segments.length === 2 && segments[0] === "bookings" && segments[1] === "guide") return method === "GET";
  if (segments.length === 3 && segments[0] === "bookings" && objectId.test(segments[1]) && segments[2] === "cancel") return method === "POST";
  if (segments.length === 1 && segments[0] === "messages") return method === "POST";
  if (segments.length === 2 && segments[0] === "messages" && segments[1] === "conversations") return method === "GET";
  return segments.length === 3 && segments[0] === "messages" && segments[1] === "conversations"
    && conversationId.test(segments[2]) && method === "GET";
}

export async function GET(request: NextRequest, context: { params: Promise<{ segments: string[] }> }) {
  return forward(request, context, "GET");
}

export async function POST(request: NextRequest, context: { params: Promise<{ segments: string[] }> }) {
  return forward(request, context, "POST");
}

export async function PUT(request: NextRequest, context: { params: Promise<{ segments: string[] }> }) {
  return forward(request, context, "PUT");
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ segments: string[] }> }) {
  return forward(request, context, "DELETE");
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ segments: string[] }> }) {
  return forward(request, context, "PATCH");
}

async function forward(
  request: NextRequest,
  context: { params: Promise<{ segments: string[] }> },
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
) {
  const { segments } = await context.params;
  const respond = (payload: unknown, status: number) => NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return respond({ detail: "Sign in to continue." }, 401);
  if (!allowed(segments, method)) return respond({ detail: "Route not found." }, 404);
  const query = new URL(request.url).searchParams;
  const statusValue = query.get("status");
  if (query.size > 0 && !(segments.length === 2 && segments[0] === "admin"
    && ["guides", "places"].includes(segments[1]) && query.size === 1
    && statusValue !== null
    && (segments[1] === "guides"
      ? ["pending", "published", "rejected"].includes(statusValue)
      : ["draft", "published"].includes(statusValue)))) {
    return respond({ detail: "Invalid query." }, 400);
  }
  if (method !== "GET" && request.headers.get("origin") !== new URL(request.url).origin) {
    return respond({ detail: "Origin not allowed." }, 403);
  }

  let body: string | undefined;
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      return respond({ detail: "Invalid JSON body." }, 400);
    }
    if (new TextEncoder().encode(body).byteLength > 32_768) {
      return respond({ detail: "Request is too large." }, 413);
    }
  }

  try {
    const queryString = query.size ? `?${query.toString()}` : "";
    const upstream = await fetch(`${apiBaseUrl()}/${segments.map(encodeURIComponent).join("/")}${queryString}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body } : {}),
      cache: "no-store",
    });
    if (upstream.status === 204) return new NextResponse(null, { status: 204 });
    const payload: unknown = await upstream.json().catch(() => null);
    return respond(payload ?? { detail: "Service unavailable." }, upstream.status);
  } catch {
    return respond({ detail: "Service unavailable." }, 503);
  }
}
