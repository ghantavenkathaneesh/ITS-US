import Link from "next/link";
import { Compass, House, Map, UserRound, WandSparkles } from "lucide-react";

const items = [
  { label: "Home", href: "/", icon: House },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Plan", href: "/plan-trip", icon: WandSparkles },
  { label: "Trips", href: "/trips", icon: Map },
  { label: "Profile", href: "/profile", icon: UserRound },
];

export function MobileNav() {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {items.map(({ label, href, icon: Icon }) => (
        <Link key={href} href={href}><Icon size={19} strokeWidth={1.7} /><span>{label}</span></Link>
      ))}
    </nav>
  );
}
