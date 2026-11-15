import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AdminWorkspace } from "@/components/admin-workspace";
import { getAuthenticatedApi, getCurrentUser } from "@/lib/server-api";
import { getCities } from "@/services/cities";

export const dynamic = "force-dynamic";

function listResult<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

type GuideSubmission = {
  id: string; city_slug: string; display_name: string; bio: string; languages: string[];
  interests: string[]; photo_url: string | null; status: "pending" | "published" | "rejected"; updated_at: string;
};

type CuratedPlace = {
  id: string; city_slug: string; name: string; description: string; category: string;
  area: string | null; image_url: string | null; tags: string[]; is_demo: boolean;
  status: "draft" | "published"; updated_at: string;
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) return <section className="admin-page section-wrap"><span className="small-label"><ShieldCheck size={13} /> ADMIN WORKSPACE</span><h1>Sign in with an admin account.</h1><p>Admin review tools are available only to accounts with the admin role.</p><Link className="text-link" href="/profile"><ArrowLeft size={14} /> Go to Profile</Link></section>;
  if (user.role !== "admin") return <section className="admin-page section-wrap"><span className="small-label"><ShieldCheck size={13} /> ADMIN WORKSPACE</span><h1>This space is for admins.</h1><p>Your signed-in account does not have admin access.</p><Link className="text-link" href="/profile"><ArrowLeft size={14} /> Back to Profile</Link></section>;

  const [cityResult, guideResult, draftsResult, publishedResult] = await Promise.all([
    getCities(),
    getAuthenticatedApi<unknown>("admin/guides?status=pending"),
    getAuthenticatedApi<unknown>("admin/places?status=draft"),
    getAuthenticatedApi<unknown>("admin/places?status=published"),
  ]);
  const cities = cityResult.status === "ok" ? cityResult.data : [];
  const unavailable = [guideResult.status, draftsResult.status, publishedResult.status].some((status) => status >= 500)
    || cityResult.status === "unavailable";

  return <section className="admin-page section-wrap">
    <header className="admin-page-header"><div><span className="small-label"><ShieldCheck size={13} /> ADMIN WORKSPACE</span><h1>Keep the city<br /><em>considered.</em></h1><p>Review guide submissions and curate the places travelers can discover.</p></div><Link className="text-link" href="/profile"><ArrowLeft size={14} /> Profile</Link></header>
    <AdminWorkspace
      cities={cities}
      pendingGuides={listResult<GuideSubmission>(guideResult.data)}
      draftPlaces={listResult<CuratedPlace>(draftsResult.data)}
      publishedPlaces={listResult<CuratedPlace>(publishedResult.data)}
      unavailable={unavailable}
    />
  </section>;
}
