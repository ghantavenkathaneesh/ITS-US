"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, MessageCircle, Trash2 } from "lucide-react";
import type { UserRole } from "@/types/user";
import type { BookingRequest, ConversationMessage, ConversationSummary, SavedTrip } from "@/types/traveler-data";

type Props = {
  role: UserRole;
  userId: string;
  initialTrips: SavedTrip[];
  initialBookings: BookingRequest[];
  initialConversations: ConversationSummary[];
  unavailable: boolean;
};

async function api(path: string, method = "GET", body?: unknown): Promise<{ ok: boolean; data: unknown }> {
  try {
    const response = await fetch(`/api/private/${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: null };
  }
}

export function TravelerWorkspace({ role, userId, initialTrips, initialBookings, initialConversations, unavailable }: Props) {
  const [trips, setTrips] = useState(initialTrips);
  const [bookings, setBookings] = useState(initialBookings);
  const [conversations, setConversations] = useState(initialConversations);
  const [notice, setNotice] = useState("");
  const [activeConversation, setActiveConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [replyBookingId, setReplyBookingId] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function deleteTrip(tripId: string) {
    if (!window.confirm("Delete this saved trip? This can’t be undone.")) return;
    const result = await api(`trips/${tripId}`, "DELETE");
    if (!result.ok) return setNotice("Couldn’t remove that trip. Please try again.");
    setTrips((current) => current.filter((trip) => trip.id !== tripId));
    setNotice("Trip removed from your space.");
  }

  async function cancelBooking(bookingId: string) {
    const result = await api(`bookings/${bookingId}/cancel`, "POST", {});
    if (!result.ok) return setNotice("Couldn’t cancel this request. Please try again.");
    setBookings((current) => current.map((booking) => booking.id === bookingId
      ? { ...booking, status: "cancelled" }
      : booking));
    setNotice("Request cancelled. This was not a confirmed booking.");
  }

  async function openConversation(conversation: ConversationSummary) {
    setBusy(true);
    setNotice("");
    const result = await api(`messages/conversations/${conversation.conversation_id}`);
    if (!result.ok || !Array.isArray(result.data)) {
      setNotice("This conversation is unavailable right now.");
    } else {
      setActiveConversation(conversation);
      setMessages(result.data as ConversationMessage[]);
    }
    setBusy(false);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeConversation || !messageBody.trim()) return;
    setBusy(true);
    setNotice("");
    const result = await api("messages", "POST", {
      booking_id: activeConversation.booking_id,
      body: messageBody.trim(),
    });
    if (!result.ok || typeof result.data !== "object" || result.data === null) {
      setNotice("Couldn’t send your message. Try again once the booking request is available.");
    } else {
      const message = result.data as ConversationMessage;
      setMessages((current) => [...current, message]);
      setMessageBody("");
      setConversations((current) => current.map((item) => item.conversation_id === activeConversation.conversation_id
        ? { ...item, latest_message: message.body, updated_at: message.created_at }
        : item).sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
    }
    setBusy(false);
  }

  async function sendGuideReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!replyBookingId || !replyBody.trim()) return;
    setBusy(true);
    setNotice("");
    const result = await api("messages", "POST", { booking_id: replyBookingId, body: replyBody.trim() });
    if (!result.ok) {
      setNotice("Couldn’t send your reply. This request may no longer be active.");
    } else {
      const conversationResult = await api("messages/conversations");
      if (conversationResult.ok && Array.isArray(conversationResult.data)) {
        setConversations(conversationResult.data as ConversationSummary[]);
      }
      setReplyBody("");
      setReplyBookingId("");
      setNotice("Your message was sent. Continue the conversation below.");
    }
    setBusy(false);
  }

  return (
    <div className="workspace-content">
      {notice && <p className="workspace-notice" role="status">{notice}</p>}
      {unavailable && <p className="workspace-notice" role="status">Some account data couldn’t be loaded. Refresh to try again.</p>}
      {role === "traveler" && <>
        <section className="workspace-section">
          <div className="workspace-heading"><div><span className="small-label">YOUR OWN PLANS</span><h2>Saved trips</h2></div><Link className="button button-dark" href="/plan-trip">Plan a trip <ArrowRight size={15} /></Link></div>
          {trips.length === 0 ? <div className="workspace-empty"><p>No saved plans yet. Start with a flexible draft for Hyderabad.</p><Link className="text-link" href="/plan-trip">Make your first plan <ArrowRight size={14} /></Link></div> :
            <div className="workspace-trip-grid">{trips.map((trip) => <article className="workspace-trip" key={trip.id}>
              <div className="workspace-trip-top"><span className="small-label">{trip.city_name} · {trip.days.length} {trip.days.length === 1 ? "DAY" : "DAYS"}</span><button className="icon-button" type="button" aria-label={`Delete ${trip.title}`} onClick={() => deleteTrip(trip.id)}><Trash2 size={15} /></button></div>
              <h3>{trip.title}</h3><p>{trip.overview}</p>
              <div className="workspace-trip-days">{trip.days.map((day) => <span key={day.day_number}>DAY {day.day_number} · {day.theme}</span>)}</div>
              {trip.days.some((day) => day.activities.some((activity) => activity.is_demo)) && <span className="demo-chip">INCLUDES DEMO PLACES</span>}
            </article>)}</div>}
        </section>
        <section className="workspace-section">
          <div className="workspace-heading"><div><span className="small-label">LOCAL GUIDE REQUESTS</span><h2>Booking requests</h2></div></div>
          {bookings.length === 0 ? <div className="workspace-empty"><p>When you request time with a local guide, it will appear here. Requests aren’t confirmed until a guide responds.</p><Link className="text-link" href="/explore/hyderabad">Meet Hyderabad guides <ArrowRight size={14} /></Link></div> :
            <div className="workspace-booking-list">{bookings.map((booking) => <article className="workspace-booking" key={booking.id}>
              <div><span className={`booking-status status-${booking.status}`}>{booking.status === "requested" ? "REQUEST SENT" : "CANCELLED"}</span><h3>{booking.guide_name}</h3><p>{booking.city_slug.replaceAll("-", " ")} · {booking.guest_count} {booking.guest_count === 1 ? "guest" : "guests"}</p></div>
              <div className="workspace-booking-actions">{booking.requested_date && <span><CalendarDays size={14} />{new Date(`${booking.requested_date.slice(0, 10)}T00:00:00`).toLocaleDateString()}</span>}{booking.status === "requested" && <button className="text-button" type="button" onClick={() => cancelBooking(booking.id)}>Cancel request</button>}</div>
            </article>)}</div>}
        </section>
      </>}

      {role === "guide" && <section className="workspace-section">
        <div className="workspace-heading"><div><span className="small-label">INCOMING FROM TRAVELERS</span><h2>Booking requests</h2></div></div>
        {bookings.length === 0 ? <div className="workspace-empty"><p>Traveler requests sent to your published guide profile will appear here.</p></div> :
          <div className="workspace-booking-list">{bookings.map((booking) => <article className="workspace-booking guide-booking" key={booking.id}>
            <div><span className={`booking-status status-${booking.status}`}>{booking.status === "requested" ? "REQUEST SENT" : "CANCELLED"}</span><h3>{booking.city_slug.replaceAll("-", " ")} · {booking.guest_count} {booking.guest_count === 1 ? "guest" : "guests"}</h3><p>{booking.requested_date ? `Preferred date: ${new Date(`${booking.requested_date.slice(0, 10)}T00:00:00`).toLocaleDateString()}` : "No date provided"}</p>{booking.note && <p className="guide-booking-note">“{booking.note}”</p>}</div>
            {booking.status === "requested" && <div className="guide-reply">{replyBookingId === booking.id ? <form className="guide-reply-form" onSubmit={sendGuideReply}><label className="sr-only" htmlFor={`reply-${booking.id}`}>Reply to traveler</label><textarea id={`reply-${booking.id}`} rows={2} maxLength={2000} value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder="Write a message to the traveler…" required /><div><button className="text-button" type="button" onClick={() => { setReplyBookingId(""); setReplyBody(""); }}>Cancel</button><button className="button button-dark" type="submit" disabled={busy || !replyBody.trim()}>{busy ? "Sending…" : "Send message"}<ArrowRight size={13} /></button></div></form> : <button className="text-button" type="button" onClick={() => setReplyBookingId(booking.id)}>Reply to traveler</button>}</div>}
          </article>)}</div>}
      </section>}

      {(role === "traveler" || role === "guide") && <section className="workspace-section">
        <div className="workspace-heading"><div><span className="small-label">BOOKING CONVERSATIONS</span><h2>Messages</h2></div><MessageCircle size={18} /></div>
        {conversations.length === 0 ? <div className="workspace-empty"><p>Messages with a guide or traveler appear here after a booking request is sent.</p></div> :
          <div className="messages-layout">
            <div className="conversation-list" aria-label="Conversations">{conversations.map((conversation) => <button key={conversation.conversation_id} className={`conversation-option${activeConversation?.conversation_id === conversation.conversation_id ? " active" : ""}`} type="button" onClick={() => openConversation(conversation)}><strong>{conversation.other_user_name}</strong><span>{conversation.latest_message}</span></button>)}</div>
            <div className="conversation-thread">
              {!activeConversation ? <p className="thread-empty">Choose a conversation to read messages.</p> : <>
                <div className="thread-heading"><span className="small-label">WITH {activeConversation.other_user_name.toUpperCase()}</span><p>Booking request conversation</p></div>
                <div className="thread-messages">{messages.map((message) => <article className={`thread-message${message.sender_id === userId ? "" : " received"}`} key={message.id}><p>{message.body}</p><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time></article>)}</div>
                <form className="message-form" onSubmit={sendMessage}><label className="sr-only" htmlFor="message-body">Your message</label><textarea id="message-body" value={messageBody} onChange={(event) => setMessageBody(event.target.value)} maxLength={2000} rows={2} placeholder="Write a message…" required /><button className="button button-dark" type="submit" disabled={busy || !messageBody.trim()}>{busy ? "Sending…" : "Send"}<ArrowRight size={14} /></button></form>
              </>}
            </div>
          </div>}
      </section>}
    </div>
  );
}
