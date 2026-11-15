import { AuthForm } from "@/components/auth-form";
import { GuideProfileEditor } from "@/components/guide-profile-editor";
import { SignOutButton } from "@/components/sign-out-button";
import { getCities } from "@/services/cities";
import { getCurrentUser } from "@/lib/server-api";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <section className="profile-page section-wrap">
        <div className="profile-intro"><span className="small-label">YOUR SPACE</span><h1>Come as you are.<br /><em>We’ll take it from here.</em></h1><p>Create an account to keep your travel plans together, or sign in to pick up where you left off.</p></div>
        <AuthForm />
      </section>
    );
  }

  const cityResult = user.role === "guide" ? await getCities() : null;
  const cities = cityResult?.status === "ok" ? cityResult.data : [];
  return (
    <section className="profile-page section-wrap">
      <div className="profile-welcome">
        <div><span className="small-label">YOUR SPACE · {user.role.toUpperCase()}</span><h1>Hello, {user.display_name.split(" ")[0]}.</h1><p>{user.email}</p></div>
        <SignOutButton />
      </div>
      {user.role === "guide" ? (
        <><GuideProfileEditor cities={cities} defaultName={user.display_name} /><div className="profile-panel guide-inbox-link"><span className="small-label">TRAVELER REQUESTS</span><h2>Keep the conversation going.</h2><p>Review booking requests and message travelers from your guide workspace.</p><Link className="text-link" href="/trips">Open guide workspace <ArrowRight size={14} /></Link></div></>
      ) : user.role === "admin" ? (
        <div className="profile-panel traveler-panel"><span className="small-label">ADMIN</span><h2>Review what enters the city catalog.</h2><p>Publish guide profiles and curate place listings for travelers.</p><Link className="text-link" href="/admin">Open admin workspace <ArrowRight size={14} /></Link></div>
      ) : (
        <div className="profile-panel traveler-panel"><span className="small-label">TRAVELER</span><h2>Your plans, in one place.</h2><p>Save flexible AI-assisted itineraries, manage guide requests, and pick up conversations with local guides.</p><Link className="text-link" href="/trips">Open your trips <ArrowRight size={14} /></Link></div>
      )}
    </section>
  );
}
