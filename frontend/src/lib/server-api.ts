import { cookies } from "next/headers";
import type { User } from "@/types/user";

export const AUTH_COOKIE = "itsus_access_token";

export async function getAuthenticatedApi<T>(path: string): Promise<{ status: number; data: T | null }> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return { status: 401, data: null };
  try {
    const response = await fetch(`${apiBaseUrl()}/${path.replace(/^\/+/, "")}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data: unknown = await response.json().catch(() => null);
    return { status: response.status, data: response.ok ? data as T : null };
  } catch {
    return { status: 503, data: null };
  }
}

export function apiBaseUrl(): string {
  const configured = process.env.API_INTERNAL_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? "http://localhost:8000/api/v1";
  return configured.replace(/\/+$/, "");
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!token) return null;
  try {
    const response = await fetch(`${apiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) return null;
    const user = payload as Record<string, unknown>;
    if (typeof user.id !== "string" || typeof user.display_name !== "string"
      || typeof user.email !== "string" || typeof user.created_at !== "string"
      || !["traveler", "guide", "admin"].includes(String(user.role))) return null;
    return {
      id: user.id as string,
      display_name: user.display_name as string,
      email: user.email as string,
      role: user.role as User["role"],
      created_at: user.created_at as string,
    };
  } catch {
    return null;
  }
}
