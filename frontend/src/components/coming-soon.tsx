import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

type ComingSoonProps = { eyebrow: string; title: string; description: string };

export function ComingSoon({ eyebrow, title, description }: ComingSoonProps) {
  return (
    <section className="coming-page section-wrap">
      <span className="small-label"><Sparkles size={13} />{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <span className="coming-chip">Coming soon</span>
      <Link href="/" className="coming-back"><ArrowLeft size={15} /> Back to home</Link>
    </section>
  );
}
