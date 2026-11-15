import Link from "next/link";
import { ArrowLeft, Languages, MapPin, Sparkles } from "lucide-react";
import { getCityCatalog } from "@/services/cities";
import { getCurrentUser } from "@/lib/server-api";
import { BookingRequestForm } from "@/components/booking-request-form";

export const dynamic = "force-dynamic";

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [result, user] = await Promise.all([getCityCatalog(slug), getCurrentUser()]);

  if (result.status === "not-found") {
    return <section className="explore-page section-wrap"><Link href="/explore" className="coming-back"><ArrowLeft size={15} /> All cities</Link><h1>That city isn’t here yet.</h1><p className="explore-intro">Try an active destination from the city list.</p></section>;
  }
  if (result.status === "unavailable") {
    return <section className="explore-page section-wrap"><Link href="/explore" className="coming-back"><ArrowLeft size={15} /> All cities</Link><h1>The city details are unavailable.</h1><p className="explore-intro">Please try again in a little while.</p></section>;
  }

  const { city, places, guides } = result.data;
  return (
    <section className="city-detail section-wrap">
      <Link href="/explore" className="coming-back"><ArrowLeft size={15} /> All cities</Link>
      <div className="city-detail-heading">
        <span className="small-label"><MapPin size={13} />{city.region}, {city.country}</span>
        <h1>{city.name}<span>.</span></h1>
        {city.is_launch_city && <span className="launch-label detail-launch">ITS US · FIRST CITY</span>}
        <p>Take your time. Meet the city through the people and places that make it theirs.</p>
      </div>

      <div className="city-catalog-grid">
        <section className="catalog-section">
          <div className="catalog-title"><div><span className="small-label">LOCAL PLACES</span><h2>Worth a closer look</h2></div><span className="catalog-count">{places.length.toString().padStart(2, "0")}</span></div>
          {places.length === 0 ? (
            <div className="catalog-empty"><Sparkles size={16} /><p>Local place notes are being prepared for this city.</p></div>
          ) : (
            <div className="catalog-list">{places.map((place) => <article className="catalog-item" key={place.id}><div className="catalog-item-heading"><span className="catalog-item-category">{place.category}</span>{place.is_demo && <span className="demo-chip">DEMO</span>}</div><h3>{place.name}</h3><p>{place.description}</p><div className="catalog-item-meta">{place.area && <span><MapPin size={13} />{place.area}</span>}{place.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}</div>
          )}
        </section>
        <section className="catalog-section">
          <div className="catalog-title"><div><span className="small-label">PEOPLE WHO LIVE HERE</span><h2>Local guides</h2></div><span className="catalog-count">{guides.length.toString().padStart(2, "0")}</span></div>
          {guides.length === 0 ? (
            <div className="catalog-empty"><Sparkles size={16} /><p>Local guide profiles will show here when they’re ready.</p></div>
          ) : (
            <div className="catalog-list">{guides.map((guide) => <article className="catalog-item guide-item" key={guide.id}><span className="guide-initial" aria-hidden="true">{guide.display_name.slice(0, 1).toUpperCase()}</span><h3>{guide.display_name}</h3><p>{guide.bio}</p>{guide.languages.length > 0 && <div className="catalog-item-meta"><Languages size={13} />{guide.languages.join(" · ")}</div>}{guide.interests.length > 0 && <div className="guide-interests">{guide.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>}<BookingRequestForm guideId={guide.id} guideName={guide.display_name} role={user?.role ?? null} /></article>)}</div>
          )}
        </section>
      </div>
      <p className="demo-note">No ratings, verification badges, prices, or availability are shown until those details can be backed by real services.</p>
    </section>
  );
}
