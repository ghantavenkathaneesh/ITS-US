export type SavedTripActivity = {
  place_id: string;
  place_name: string;
  is_demo: boolean;
  time_block: "morning" | "afternoon" | "evening";
  idea: string;
};

export type SavedTripDay = {
  day_number: number;
  theme: string;
  activities: SavedTripActivity[];
};

export type SavedTrip = {
  id: string;
  city_slug: string;
  city_name: string;
  title: string;
  overview: string;
  days: SavedTripDay[];
  created_at: string;
  updated_at: string;
};

export type BookingRequest = {
  id: string;
  guide_id: string;
  guide_name: string;
  city_slug: string;
  requested_date: string | null;
  guest_count: number;
  note: string | null;
  status: "requested" | "cancelled";
  created_at: string;
  updated_at: string;
};

export type ConversationSummary = {
  conversation_id: string;
  booking_id: string;
  other_user_id: string;
  other_user_name: string;
  latest_message: string;
  updated_at: string;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  booking_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};
