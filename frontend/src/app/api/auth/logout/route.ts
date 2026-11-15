import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/server-api";

export async function POST() {
  const response = NextResponse.json({ signed_out: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
