import { authenticate } from "@/app/api/auth/_shared";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  return authenticate(request, "register");
}
