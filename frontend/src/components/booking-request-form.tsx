"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays } from "lucide-react";
import type { UserRole } from "@/types/user";

type Props = { guideId: string; guideName: string; role: UserRole | null };

export function BookingRequestForm({ guideId, guideName, role }: Props) {
  const [open, setOpen] = useState(false);
  const [requestedDate, setRequestedDate] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/private/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guide_id: guideId,
          requested_date: requestedDate || null,
          guest_count: guestCount,
          note: note.trim() || null,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>).detail
          : null;
        setMessage(typeof detail === "string" ? detail : "We couldn’t send your request right now.");
      } else {
        setSuccess(true);
        setMessage("Request sent. It is not confirmed until the guide responds.");
      }
    } catch {
      setMessage("Booking requests are unavailable right now.");
    } finally {
      setBusy(false);
    }
  }

  if (!role) return <Link className="text-link guide-request-link" href="/profile">Sign in to contact {guideName.split(" ")[0]} <ArrowRight size={13} /></Link>;
  if (role !== "traveler") return <p className="guide-request-hint">Traveler accounts can send a request to this guide.</p>;

  return <div className="guide-request">
    {!open ? <button className="guide-request-toggle" type="button" onClick={() => setOpen(true)}><CalendarDays size={14} /> Request time with {guideName.split(" ")[0]} <ArrowRight size={13} /></button> : success ? <div className="booking-success" role="status"><p>{message}</p><Link href="/trips">View your requests <ArrowRight size={13} /></Link></div> : <form className="booking-form" onSubmit={submit}>
      <label htmlFor={`booking-date-${guideId}`}>Preferred date <span>optional</span></label>
      <input id={`booking-date-${guideId}`} type="date" min={new Date().toISOString().slice(0, 10)} value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} />
      <label htmlFor={`booking-guests-${guideId}`}>Travelers</label>
      <select id={`booking-guests-${guideId}`} value={guestCount} onChange={(event) => setGuestCount(Number(event.target.value))}>{Array.from({ length: 10 }, (_, index) => index + 1).map((count) => <option value={count} key={count}>{count}</option>)}</select>
      <label htmlFor={`booking-note-${guideId}`}>A note for the guide <span>optional</span></label>
      <textarea id={`booking-note-${guideId}`} rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Share a little about what you’d like to explore." />
      {message && <p className="form-error" role="alert">{message}</p>}
      <div className="booking-form-actions"><button className="text-button" type="button" onClick={() => { setOpen(false); setMessage(""); }}>Cancel</button><button className="button button-dark" type="submit" disabled={busy}>{busy ? "Sending…" : "Send request"}<ArrowRight size={13} /></button></div>
      <p className="planner-note">This sends a request, not a confirmed booking. No payment is collected.</p>
    </form>}
  </div>;
}
