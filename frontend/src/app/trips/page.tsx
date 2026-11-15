import Link from "next/link";
import { ArrowRight, Map } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { TravelerWorkspace } from "@/components/traveler-workspace";
import { getAuthenticatedApi, getCurrentUser } from "@/lib/server-api";
import type { BookingRequest, ConversationSummary, SavedTrip } from "@/types/traveler-data";

export const dynamic = "force-dynamic";

function listResult<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

export default async function TripsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <section className="trips-page section-wrap"><header className="trips-header"><span className="small-label">YOUR TRAVEL NOTES</span><h1>Keep the good<br /><em>parts close.</em></h1><p>Sign in to save a plan, keep track of guide requests, and continue your conversations.</p></header><div className="trips-auth"><AuthForm /></div></section>;
  }

  const [tripsResult, bookingsResult, conversationsResult] = await Promise.all([
    user.role === "traveler" ? getAuthenticatedApi<unknown>("trips") : Promise.resolve({ status: 200, data: [] }),
    user.role === "traveler"
      ? getAuthenticatedApi<unknown>("bookings")
      : user.role === "guide" ? getAuthenticatedApi<unknown>("bookings/guide") : Promise.resolve({ status: 200, data: [] }),
    user.role === "traveler" || user.role === "guide"
      ? getAuthenticatedApi<unknown>("messages/conversations")
      : Promise.resolve({ status: 200, data: [] }),
  ]);

  const unavailable = [tripsResult.status, bookingsResult.status, conversationsResult.status].some((status) => status >= 500);
  const trips = listResult<SavedTrip>(tripsResult.data);
  const bookings = listResult<BookingRequest>(bookingsResult.data);
  const conversations = listResult<ConversationSummary>(conversationsResult.data);

  return <section className="trips-page section-wrap">
    <header className="trips-header trips-header-signed"><div><span className="small-label"><Map size={13} /> YOUR TRAVEL NOTES</span><h1>{user.role === "guide" ? <>Your guide<br /><em>conversations.</em></> : <>Your trips,<br /><em>your own pace.</em></>}</h1><p>{user.role === "guide" ? "Keep up with travelers who have sent a booking request." : "Plans, requests, and conversations in one private place."}</p></div>{user.role === "traveler" && <Link className="button button-dark" href="/plan-trip">Plan a trip <ArrowRight size={15} /></Link>}</header>
    {user.role === "admin" ? <div className="catalog-message">Travel plans and guide conversations are available to traveler and guide accounts.</div> :
      <TravelerWorkspace
        role={user.role}
        userId={user.id}
        initialTrips={trips}
        initialBookings={bookings}
        initialConversations={conversations}
        unavailable={unavailable}
      />}
  </section>;
}
