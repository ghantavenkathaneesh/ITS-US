import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

const navItems = [
  { label: "Explore", href: "/explore" },
  { label: "Plan a trip", href: "/plan-trip" },
  { label: "My trips", href: "/trips" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="ITS US home">
        <span className="brand-mark">i</span><span>its us<span className="brand-period">.</span></span>
      </Link>
      <div className="city-pill"><MapPin size={14} strokeWidth={1.8} /><span>Hyderabad, India</span></div>
      <nav className="desktop-nav" aria-label="Main navigation">
        {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
      </nav>
      <Link className="profile-link" href="/profile" aria-label="Your profile"><span>Profile</span><ArrowUpRight size={15} /></Link>
    </header>
  );
}
