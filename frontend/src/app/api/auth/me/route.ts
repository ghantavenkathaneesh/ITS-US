import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl, AUTH_COOKIE } from "@/lib/server-api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: "Not signed in" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const upstream = await fetch(`${apiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload: unknown = await upstream.json().catch(() => null);
    const response = NextResponse.json(payload ?? { detail: "Account service unavailable" }, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
    if (upstream.status === 401) response.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ detail: "Account service unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
