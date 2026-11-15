export type UserRole = "traveler" | "guide" | "admin";

export type User = {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

export type GuideProfile = {
  id: string;
  city_slug: string;
  display_name: string;
  bio: string;
  languages: string[];
  interests: string[];
  photo_url: string | null;
  status: "pending" | "published" | "rejected";
  updated_at: string;
};
