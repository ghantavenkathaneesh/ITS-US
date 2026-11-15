"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check, Map, Sparkles } from "lucide-react";
import type { City } from "@/types/city";
import type { TripPlan } from "@/types/trip-plan";

type Props = { cities: City[] };
const interestOptions = ["food", "architecture", "history", "markets", "slow walks"];
const timeLabels = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

function isPlan(value: unknown): value is TripPlan {
  if (typeof value !== "object" || value === null) return false;
  const plan = value as Record<string, unknown>;
  if (typeof plan.title !== "string" || typeof plan.overview !== "string"
    || typeof plan.city !== "object" || plan.city === null || !Array.isArray(plan.days)) return false;
  const city = plan.city as Record<string, unknown>;
  if (typeof city.id !== "string" || typeof city.name !== "string"
    || typeof city.slug !== "string" || typeof city.country !== "string"
    || typeof city.region !== "string" || typeof city.is_launch_city !== "boolean"
    || typeof city.created_at !== "string" || plan.days.length === 0) return false;
  return plan.days.every((day) => {
    if (typeof day !== "object" || day === null) return false;
    const item = day as Record<string, unknown>;
    return typeof item.day_number === "number" && typeof item.theme === "string"
      && Array.isArray(item.activities)
      && item.activities.every((activity) => {
        if (typeof activity !== "object" || activity === null) return false;
        const part = activity as Record<string, unknown>;
        return typeof part.place_id === "string" && typeof part.place_name === "string"
          && typeof part.is_demo === "boolean" && typeof part.idea === "string"
          && ["morning", "afternoon", "evening"].includes(String(part.time_block));
      });
  });
}

export function TripPlannerForm({ cities }: Props) {
  const [selectedCity, setSelectedCity] = useState(cities[0]?.slug ?? "");
  const [days, setDays] = useState(1);
  const [pace, setPace] = useState("balanced");
  const [interests, setInterests] = useState<string[]>(["food"]);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTripId, setSavedTripId] = useState("");
  const [saveError, setSaveError] = useState("");

  function toggleInterest(interest: string) {
    setInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : current.length < 5 ? [...current, interest] : current);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPlan(null);
    setSavedTripId("");
    setSaveError("");
    if (!selectedCity || interests.length === 0) {
      setError("Choose a city and at least one interest.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/trips/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city_slug: selectedCity, days, interests, pace }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof result === "object" && result !== null
          ? (result as Record<string, unknown>).detail
          : null;
        setError(typeof detail === "string" ? detail : "We couldn’t make a plan right now.");
      } else if (!isPlan(result)) {
        setError("The planning service returned an invalid plan. Please try again.");
      } else {
        setPlan(result);
      }
    } catch {
      setError("Trip planning service is unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  async function savePlan() {
    if (!plan) return;
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch("/api/private/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city_slug: plan.city.slug,
          title: plan.title,
          overview: plan.overview,
          days: plan.days.map((day) => ({
            day_number: day.day_number,
            theme: day.theme,
            activities: day.activities.map(({ place_id, time_block, idea }) => ({ place_id, time_block, idea })),
          })),
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || typeof payload !== "object" || payload === null
        || typeof (payload as Record<string, unknown>).id !== "string") {
        const detail = typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>).detail
          : null;
        setSaveError(typeof detail === "string" ? detail : "We couldn’t save this plan right now.");
      } else {
        setSavedTripId((payload as Record<string, string>).id);
      }
    } catch {
      setSaveError("Your trip space is unavailable right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="planner-grid">
      <form className="planner-form" onSubmit={submit}>
        <label htmlFor="plan-city">Where to?</label>
        <select id="plan-city" value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)} required>
          {cities.map((city) => <option value={city.slug} key={city.id}>{city.name}, {city.country}</option>)}
        </select>
        <label htmlFor="plan-days">How many days?</label>
        <select id="plan-days" value={days} onChange={(event) => setDays(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map((day) => <option value={day} key={day}>{day} {day === 1 ? "day" : "days"}</option>)}
        </select>
        <label htmlFor="plan-pace">Your pace</label>
        <select id="plan-pace" value={pace} onChange={(event) => setPace(event.target.value)}>
          <option value="relaxed">Take it slow</option><option value="balanced">A bit of both</option><option value="full">Pack the day</option>
        </select>
        <fieldset className="planner-interests"><legend>What do you enjoy?</legend>
          <div className="interest-options">{interestOptions.map((interest) => <label className="interest-option" key={interest}><input type="checkbox" checked={interests.includes(interest)} onChange={() => toggleInterest(interest)} /><span>{interest}</span></label>)}</div>
        </fieldset>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-dark" type="submit" disabled={busy || cities.length === 0}>{busy ? "Finding a rhythm…" : "Shape my trip"}<ArrowRight size={15} /></button>
        <p className="planner-note">The plan is a suggestion{savedTripId ? " and is saved in My Trips" : " and isn’t saved yet"}. It won’t include live prices, opening hours, or availability.</p>
      </form>

      <section className={`planner-result${plan ? " has-plan" : ""}`} aria-live="polite">
        {!plan ? <div className="planner-empty"><Sparkles size={18} /><h2>A little local perspective.</h2><p>Choose what matters to you. We’ll shape a flexible outline from this city’s published catalog.</p>{cities.length === 0 && <p className="planner-note">No active cities are available right now.</p>}</div> : <>
          <span className="small-label"><Check size={13} />A FIRST DRAFT · {plan.city.name.toUpperCase()}</span>
          <h2>{plan.title}</h2>
          <p>{plan.overview}</p>
          {plan.days.some((day) => day.activities.some((activity) => activity.is_demo)) && <div className="planner-demo-notice">This plan uses clearly marked demo entries. Replace those with locally reviewed details before relying on the itinerary.</div>}
          <div className="planner-days">{plan.days.map((day) => <article className="planner-day" key={day.day_number}><div className="planner-day-heading"><span className="planner-day-number">DAY {String(day.day_number).padStart(2, "0")}</span><h3>{day.theme}</h3></div><div className="planner-activities">{day.activities.map((activity, index) => <div className="planner-activity" key={`${activity.place_id}-${index}`}><span className="planner-time">{timeLabels[activity.time_block]}</span><div><div className="planner-place-title"><h4>{activity.place_name}</h4>{activity.is_demo && <span className="demo-chip">DEMO</span>}</div><p>{activity.idea}</p></div></div>)}</div></article>)}</div>
          <div className="planner-save-row">
            {savedTripId ? <Link className="button button-dark" href="/trips"><Check size={15} />Saved to My Trips <ArrowRight size={15} /></Link> : <button className="button button-dark" type="button" onClick={savePlan} disabled={saving}>{saving ? "Saving your plan…" : "Save to My Trips"}<Map size={15} /></button>}
            {saveError && <p className="form-error" role="alert">{saveError}</p>}
          </div>
          <p className="planner-note">Flexible ideas only. Check current local conditions before you head out.</p>
        </>}
      </section>
    </div>
  );
}
