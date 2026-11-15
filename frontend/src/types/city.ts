export type City = {
  id: string;
  slug: string;
  name: string;
  region: string;
  country: string;
  is_launch_city: boolean;
  created_at: string;
};

export type Place = {
  id: string;
  name: string;
  description: string;
  category: string;
  area: string | null;
  image_url: string | null;
  tags: string[];
  is_demo: boolean;
  created_at: string;
};

export type Guide = {
  id: string;
  display_name: string;
  bio: string;
  languages: string[];
  interests: string[];
  photo_url: string | null;
};

export type CityCatalog = { city: City; places: Place[]; guides: Guide[] };

export type ApiResult<T> =
  | { status: "ok"; data: T }
  | { status: "not-found" }
  | { status: "unavailable" };
