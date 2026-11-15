import type { ApiResult, City, CityCatalog, Guide, Place } from "@/types/city";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCity(value: unknown): value is City {
  return isObject(value)
    && typeof value.id === "string"
    && typeof value.slug === "string"
    && typeof value.name === "string"
    && typeof value.region === "string"
    && typeof value.country === "string"
    && typeof value.is_launch_city === "boolean"
    && typeof value.created_at === "string";
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPlace(value: unknown): value is Place {
  return isObject(value)
    && typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.description === "string"
    && typeof value.category === "string"
    && (typeof value.area === "string" || value.area === null)
    && (typeof value.image_url === "string" || value.image_url === null)
    && isStringList(value.tags)
    && typeof value.is_demo === "boolean"
    && typeof value.created_at === "string";
}

function isGuide(value: unknown): value is Guide {
  return isObject(value)
    && typeof value.id === "string"
    && typeof value.display_name === "string"
    && typeof value.bio === "string"
    && isStringList(value.languages)
    && isStringList(value.interests)
    && (typeof value.photo_url === "string" || value.photo_url === null);
}

function isCityCatalog(value: unknown): value is CityCatalog {
  return isObject(value)
    && isCity(value.city)
    && Array.isArray(value.places)
    && value.places.every(isPlace)
    && Array.isArray(value.guides)
    && value.guides.every(isGuide);
}

function apiBaseUrl(): string {
  const configured = process.env.API_INTERNAL_URL
    ?? process.env.NEXT_PUBLIC_API_URL
    ?? "http://localhost:8000/api/v1";
  return configured.replace(/\/+$/, "");
}

export async function getCities(): Promise<Exclude<ApiResult<City[]>, { status: "not-found" }>> {
  try {
    const response = await fetch(`${apiBaseUrl()}/cities`, { cache: "no-store" });
    if (!response.ok) return { status: "unavailable" };
    const payload: unknown = await response.json();
    return Array.isArray(payload) && payload.every(isCity)
      ? { status: "ok", data: payload }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export async function getCityCatalog(slug: string): Promise<ApiResult<CityCatalog>> {
  try {
    const response = await fetch(
      `${apiBaseUrl()}/cities/${encodeURIComponent(slug)}/catalog`,
      { cache: "no-store" },
    );
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "unavailable" };
    const payload: unknown = await response.json();
    return isCityCatalog(payload)
      ? { status: "ok", data: payload }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
