"use client";

import { useState, type FormEvent } from "react";
import { Check, EyeOff, Plus, Send, ShieldCheck } from "lucide-react";
import type { City } from "@/types/city";

type GuideSubmission = {
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

type CuratedPlace = {
  id: string;
  city_slug: string;
  name: string;
  description: string;
  category: string;
  area: string | null;
  image_url: string | null;
  tags: string[];
  is_demo: boolean;
  status: "draft" | "published";
  updated_at: string;
};

type Props = { cities: City[]; pendingGuides: GuideSubmission[]; draftPlaces: CuratedPlace[]; publishedPlaces: CuratedPlace[]; unavailable: boolean };

async function send(path: string, method: string, body: unknown): Promise<{ ok: boolean; data: unknown }> {
  try {
    const response = await fetch(`/api/private/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: response.ok, data: await response.json().catch(() => null) };
  } catch {
    return { ok: false, data: null };
  }
}

export function AdminWorkspace({ cities, pendingGuides, draftPlaces, publishedPlaces, unavailable }: Props) {
  const [guides, setGuides] = useState(pendingGuides);
  const [drafts, setDrafts] = useState(draftPlaces);
  const [published, setPublished] = useState(publishedPlaces);
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [creating, setCreating] = useState(false);
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [isDemo, setIsDemo] = useState(false);

  async function moderateGuide(guide: GuideSubmission, status: "published" | "rejected") {
    setBusyId(guide.id);
    setNotice("");
    const result = await send(`admin/guides/${guide.id}/status`, "PATCH", { status });
    setBusyId("");
    if (!result.ok) return setNotice(`Couldn’t update ${guide.display_name}’s profile. Please try again.`);
    setGuides((current) => current.filter((item) => item.id !== guide.id));
    setNotice(status === "published"
      ? `${guide.display_name}’s profile is now public. Publication is not identity verification.`
      : `${guide.display_name}’s profile was rejected.`);
  }

  async function moderatePlace(place: CuratedPlace, status: "draft" | "published") {
    setBusyId(place.id);
    setNotice("");
    const result = await send(`admin/places/${place.id}/status`, "PATCH", { status });
    setBusyId("");
    if (!result.ok || typeof result.data !== "object" || result.data === null) {
      return setNotice(`Couldn’t update ${place.name}. Please try again.`);
    }
    const updated = result.data as CuratedPlace;
    if (status === "published") {
      setDrafts((current) => current.filter((item) => item.id !== place.id));
      setPublished((current) => [updated, ...current]);
      setNotice(`${place.name} is now in the published city catalog.`);
    } else {
      setPublished((current) => current.filter((item) => item.id !== place.id));
      setDrafts((current) => [updated, ...current]);
      setNotice(`${place.name} was hidden from the public catalog.`);
    }
  }

  async function createPlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!citySlug) return setNotice("Add an active city before creating a place.");
    setCreating(true);
    setNotice("");
    const result = await send(`admin/cities/${citySlug}/places`, "POST", {
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      area: area.trim() || null,
      image_url: imageUrl.trim() || null,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      is_demo: isDemo,
    });
    setCreating(false);
    if (!result.ok || typeof result.data !== "object" || result.data === null) {
      const data = result.data as Record<string, unknown> | null;
      setNotice(typeof data?.detail === "string" ? data.detail : "Couldn’t create this draft. Check its fields and try again.");
      return;
    }
    setDrafts((current) => [result.data as CuratedPlace, ...current]);
    setName(""); setDescription(""); setCategory(""); setArea(""); setImageUrl(""); setTags(""); setIsDemo(false);
    setNotice("Place saved as a private draft. Publish it after review.");
  }

  return <div className="admin-workspace">
    {notice && <p className="workspace-notice" role="status">{notice}</p>}
    {unavailable && <p className="workspace-notice" role="status">Some review data couldn’t be loaded. Refresh to try again.</p>}
    <section className="workspace-section">
      <div className="workspace-heading"><div><span className="small-label">GUIDE PROFILES</span><h2>Pending review <span className="admin-count">{guides.length}</span></h2></div><ShieldCheck size={18} /></div>
      {guides.length === 0 ? <div className="workspace-empty"><p>No guide profiles are waiting for review.</p></div> : <div className="admin-review-list">{guides.map((guide) => <article className="admin-review-card" key={guide.id}>
        <div className="admin-card-top"><span className="booking-status status-requested">PENDING</span><span className="admin-city">{guide.city_slug.replaceAll("-", " ")}</span></div>
        <h3>{guide.display_name}</h3><p>{guide.bio}</p>
        <div className="admin-tags">{guide.languages.map((language) => <span key={`lang-${language}`}>{language}</span>)}{guide.interests.map((interest) => <span key={`interest-${interest}`}>{interest}</span>)}</div>
        {guide.photo_url && <a className="admin-external" href={guide.photo_url} target="_blank" rel="noreferrer">Open profile image</a>}
        <p className="admin-review-note">Publishing lists this profile publicly. It does not verify identity or credentials.</p>
        <div className="admin-actions"><button className="button button-dark" type="button" disabled={busyId === guide.id} onClick={() => moderateGuide(guide, "published")}><Check size={14} />{busyId === guide.id ? "Saving…" : "Publish profile"}</button><button className="text-button" type="button" disabled={busyId === guide.id} onClick={() => moderateGuide(guide, "rejected")}>Reject</button></div>
      </article>)}</div>}
    </section>

    <section className="workspace-section">
      <div className="workspace-heading"><div><span className="small-label">CITY CATALOG</span><h2>Add a place</h2></div><Plus size={18} /></div>
      {cities.length === 0 ? <div className="workspace-empty"><p>No active cities are available. Add a city through the existing data workflow before adding catalog entries.</p></div> : <form className="admin-place-form" onSubmit={createPlace}>
        <div className="admin-form-grid">
          <label>City<select value={citySlug} onChange={(event) => setCitySlug(event.target.value)}>{cities.map((city) => <option key={city.id} value={city.slug}>{city.name}, {city.country}</option>)}</select></label>
          <label>Place name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required /></label>
          <label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} minLength={2} maxLength={60} placeholder="Food, history, craft…" required /></label>
          <label>Area <span>optional</span><input value={area} onChange={(event) => setArea(event.target.value)} maxLength={100} /></label>
          <label className="admin-wide">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={20} maxLength={1200} rows={3} required /></label>
          <label>Image URL <span>optional</span><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></label>
          <label>Tags <span>comma separated</span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="walking, local craft" /></label>
        </div>
        <label className="admin-demo-check"><input type="checkbox" checked={isDemo} onChange={(event) => setIsDemo(event.target.checked)} /> Mark this entry as DEMO</label>
        <div className="admin-form-footer"><p>New entries are private drafts. No pricing or availability fields are collected.</p><button className="button button-dark" type="submit" disabled={creating}>{creating ? "Saving draft…" : "Save as draft"}<Send size={14} /></button></div>
      </form>}
    </section>

    <section className="workspace-section">
      <div className="workspace-heading"><div><span className="small-label">PLACES</span><h2>Drafts for review <span className="admin-count">{drafts.length}</span></h2></div></div>
      {drafts.length === 0 ? <div className="workspace-empty"><p>No place drafts are waiting for review.</p></div> : <div className="admin-review-list">{drafts.map((place) => <article className="admin-place-card" key={place.id}>
        <div className="admin-card-top"><span className="booking-status status-requested">DRAFT</span><span className="admin-city">{place.city_slug.replaceAll("-", " ")}</span>{place.is_demo && <span className="demo-chip">DEMO</span>}</div>
        <span className="catalog-item-category">{place.category}</span><h3>{place.name}</h3><p>{place.description}</p>
        <div className="admin-tags">{place.area && <span>{place.area}</span>}{place.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
        <div className="admin-actions"><button className="button button-dark" type="button" disabled={busyId === place.id} onClick={() => moderatePlace(place, "published")}><Check size={14} />{busyId === place.id ? "Saving…" : "Publish place"}</button></div>
      </article>)}</div>}
    </section>

    <section className="workspace-section">
      <div className="workspace-heading"><div><span className="small-label">PUBLIC CITY CATALOG</span><h2>Published places <span className="admin-count">{published.length}</span></h2></div></div>
      {published.length > 0 && <div className="admin-review-list">{published.map((place) => <article className="admin-place-card" key={place.id}>
        <div className="admin-card-top"><span className="booking-status status-published">PUBLISHED</span><span className="admin-city">{place.city_slug.replaceAll("-", " ")}</span>{place.is_demo && <span className="demo-chip">DEMO</span>}</div>
        <span className="catalog-item-category">{place.category}</span><h3>{place.name}</h3><p>{place.description}</p>
        <div className="admin-actions"><button className="text-button" type="button" disabled={busyId === place.id} onClick={() => moderatePlace(place, "draft")}><EyeOff size={13} /> Hide from catalog</button></div>
      </article>)}</div>}
      {published.length === 0 && <div className="workspace-empty"><p>No places have been published yet.</p></div>}
    </section>
  </div>;
}
