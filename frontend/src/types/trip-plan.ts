import type { City } from "@/types/city";

export type PlannedActivity = {
  place_id: string;
  place_name: string;
  is_demo: boolean;
  time_block: "morning" | "afternoon" | "evening";
  idea: string;
};

export type PlannedDay = {
  day_number: number;
  theme: string;
  activities: PlannedActivity[];
};

export type TripPlan = {
  city: City;
  title: string;
  overview: string;
  days: PlannedDay[];
};
