"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import type { City } from "@/types/city";
import type { GuideProfile } from "@/types/user";

type Props = { cities: City[]; defaultName: string };

export function GuideProfileEditor({ cities, defaultName }: Props) {
  const [profile, setProfile] = useState<GuideProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/guides/me/profile", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("Your guide profile could not be loaded.");
        return await response.json() as GuideProfile;
      })
      .then((value) => { if (active) setProfile(value); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Unable to load profile."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const values = new FormData(event.currentTarget);
    const payload = {
      city_slug: values.get("city_slug"),
      display_name: values.get("display_name"),
      bio: values.get("bio"),
      languages: String(values.get("languages") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      interests: String(values.get("interests") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      photo_url: String(values.get("photo_url") ?? "").trim() || null,
    };
    try {
      const response = await fetch("/api/guides/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok || typeof result !== "object" || result === null) {
        const detail = typeof result === "object" && result !== null
          ? (result as Record<string, unknown>).detail
          : null;
        setError(typeof detail === "string" ? detail : "We couldn’t save your profile.");
        return;
      }
      const saved = result as GuideProfile;
      setProfile(saved);
      setMessage("Your profile was saved and is waiting for review.");
    } catch {
      setError("Guide profile service is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="catalog-message" role="status">Loading your guide profile…</div>;
  if (error && !profile) return <p className="form-error" role="alert">{error}</p>;

  return (
    <div className="profile-panel">
      <div className="profile-panel-heading">
        <div><span className="small-label">LOCAL GUIDE</span><h2>Your guide profile</h2></div>
        {profile && <span className={`review-status status-${profile.status}`}><Clock3 size={13} />{profile.status.replace("_", " ")}</span>}
      </div>
      <p className="profile-panel-intro">Tell travelers what you love about your city. Your profile stays private until an admin publishes it.</p>
      {cities.length === 0 ? <div className="catalog-message">No active cities are available right now, so a guide profile can’t be submitted yet.</div> : (
        <form className="guide-form" onSubmit={submit}>
          <label htmlFor="city_slug">City</label>
          <select id="city_slug" name="city_slug" defaultValue={profile?.city_slug ?? cities[0].slug} required>
            {cities.map((city) => <option key={city.id} value={city.slug}>{city.name}, {city.country}</option>)}
          </select>
          <label htmlFor="guide_name">Name shown to travelers</label>
          <input id="guide_name" name="display_name" minLength={2} maxLength={80} defaultValue={profile?.display_name ?? defaultName} required />
          <label htmlFor="bio">A little about you</label>
          <textarea id="bio" name="bio" minLength={40} maxLength={1200} rows={5} defaultValue={profile?.bio ?? ""} placeholder="Share what you enjoy showing people about your city." required />
          <label htmlFor="languages">Languages</label>
          <input id="languages" name="languages" maxLength={320} defaultValue={profile?.languages.join(", ") ?? ""} placeholder="Separate with commas" required />
          <label htmlFor="interests">Interests</label>
          <input id="interests" name="interests" maxLength={480} defaultValue={profile?.interests.join(", ") ?? ""} placeholder="Food, architecture, markets…" />
          <label htmlFor="photo_url">Profile photo URL <span>optional</span></label>
          <input id="photo_url" name="photo_url" type="url" maxLength={2083} defaultValue={profile?.photo_url ?? ""} placeholder="https://…" />
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status"><Check size={15} />{message}</p>}
          <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Saving…" : "Save for review"}<ArrowRight size={15} /></button>
        </form>
      )}
    </div>
  );
}
