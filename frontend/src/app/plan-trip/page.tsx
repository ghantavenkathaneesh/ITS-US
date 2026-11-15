import { AuthForm } from "@/components/auth-form";
import { TripPlannerForm } from "@/components/trip-planner-form";
import { getCities } from "@/services/cities";
import { getCurrentUser } from "@/lib/server-api";

export const dynamic = "force-dynamic";

export default async function PlanTripPage() {
  const user = await getCurrentUser();
  const cityResult = await getCities();
  const cities = cityResult.status === "ok" ? cityResult.data : [];

  return (
    <section className="planner-page section-wrap">
      <header className="planner-header">
        <span className="small-label">A PLAN THAT FEELS LIKE YOU</span>
        <h1>Your kind of day,<br /><em>taking shape.</em></h1>
        <p>Tell us what you enjoy. We’ll shape a flexible outline using this city’s published local catalog, then leave room for the unexpected.</p>
      </header>
      {!user ? (
        <div className="planner-auth"><p>Sign in as a traveler to create a private, unsaved plan.</p><AuthForm /></div>
      ) : user.role !== "traveler" ? (
        <div className="catalog-message">Trip planning is available to traveler accounts. You’re currently signed in as a {user.role}.</div>
      ) : cityResult.status === "unavailable" ? (
        <div className="catalog-message" role="status">The city list is unavailable right now. Please try again later.</div>
      ) : (
        <TripPlannerForm cities={cities} />
      )}
    </section>
  );
}
