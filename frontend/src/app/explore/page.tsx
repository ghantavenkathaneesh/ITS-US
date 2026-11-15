import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { getCities } from "@/services/cities";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const result = await getCities();

  return (
    <section className="explore-page section-wrap">
      <span className="small-label">GO A LITTLE CLOSER</span>
      <h1>Find a city.<br /><em>Find your people.</em></h1>
      <p className="explore-intro">We’re starting in Hyderabad. Each destination comes from city data, so new places can join without changing the app.</p>

      {result.status === "unavailable" ? (
        <div className="catalog-message" role="status">The city list is unavailable right now. Please try again in a little while.</div>
      ) : result.data.length === 0 ? (
        <div className="catalog-message" role="status">No destinations are active yet.</div>
      ) : (
        <div className="city-grid">
          {result.data.map((city, index) => (
            <Link className={`city-card city-card-${index % 3}`} href={`/explore/${city.slug}`} key={city.id}>
              <span className="city-card-index">{String(index + 1).padStart(2, "0")}</span>
              {city.is_launch_city && <span className="launch-label">LAUNCH CITY</span>}
              <div className="city-card-landmark" aria-hidden="true"><i /><i /><i /><i /><b /></div>
              <span className="city-card-location"><MapPin size={13} />{city.region}, {city.country}</span>
              <span className="city-card-name">{city.name}<ArrowRight size={17} /></span>
            </Link>
          ))}
        </div>
      )}
      <p className="catalog-footnote">Guide profiles and place listings appear once they’ve been added and published.</p>
    </section>
  );
}
