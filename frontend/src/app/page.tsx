import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Play, Sparkles } from "lucide-react";
import { ExperienceCard } from "@/components/experience-card";

const experiences = [
  { title: "Old city, new stories", area: "Charminar quarter", duration: "2.5 hours", category: "STREETS & STORIES", tone: "terracotta" as const, number: "01" },
  { title: "A table in Hyderabad", area: "Laad Bazaar", duration: "3 hours", category: "FOOD & PEOPLE", tone: "olive" as const, number: "02" },
  { title: "The city after sundown", area: "Hussain Sagar", duration: "2 hours", category: "EVENING WALKS", tone: "blue" as const, number: "03" },
];

export default function HomePage() {
  return (
    <>
      <section className="hero section-wrap">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" />A different way to find your way</div>
          <h1>Travel like a local.<br /><span>Feel like you belong.</span></h1>
          <p className="hero-description">The best parts of a place aren’t on a checklist. Find them with the people who call it home.</p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/explore/hyderabad">Find your Hyderabad <ArrowRight size={16} /></Link>
            <Link className="text-link" href="/plan-trip"><span className="play-icon"><Play size={12} fill="currentColor" /></span>Plan with AI</Link>
          </div>
          <div className="hero-footnote"><Sparkles size={14} /><span>Made around you, with a little help from AI</span></div>
        </div>
        <div className="hero-art" aria-label="Illustration inspired by Hyderabad architecture">
          <div className="hero-art-glow" />
          <div className="hero-sky-label">17° 21′ N &nbsp; 78° 29′ E</div>
          <div className="moon" />
          <div className="hero-skyline skyline-far"><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="charminar">
            <div className="tower tower-one"><b /><b /><b /></div><div className="tower tower-two"><b /><b /><b /></div>
            <div className="tower tower-three"><b /><b /><b /></div><div className="tower tower-four"><b /><b /><b /></div>
            <div className="monument"><div className="monument-top" /><div className="monument-dome" /><div className="monument-roof" /><div className="monument-body"><i /><i /><i /></div><div className="monument-base" /><div className="monument-arch"><span /></div></div>
          </div>
          <div className="hero-ground" />
          <div className="art-stamp"><span>THE CITY<br />IS YOURS</span><ArrowDown size={15} /></div>
          <div className="hero-art-caption"><span>01 — 03</span><span>Hyderabad, through local eyes</span></div>
        </div>
        <div className="hero-index"><span>01</span><i />THINGS FEEL DIFFERENT HERE</div>
      </section>

      <section className="intro-strip">
        <div className="section-wrap intro-inner"><p>Not a tour.<br /><em>A way in.</em></p><div className="intro-note"><span className="small-label">THE IDEA</span><p>Good travel isn’t about seeing more.<br />It’s about seeing differently.</p></div><Link className="circle-link" href="/explore" aria-label="Explore local experiences"><ArrowDown size={18} /></Link></div>
      </section>

      <section className="experiences section-wrap" id="explore">
        <div className="section-heading"><div><span className="small-label">START SOMEWHERE</span><h2>Hyderabad, a little<br /><em>closer.</em></h2></div><Link href="/explore" className="view-all">Explore the city <ArrowUpRight size={15} /></Link></div>
        <div className="experience-grid">{experiences.map((item) => <ExperienceCard key={item.number} {...item} />)}</div>
        <p className="demo-note">Sample concepts are marked DEMO. Only published guide profiles can receive a request, and a request is not a confirmed booking.</p>
      </section>

      <section className="plan-band" id="plan-trip"><div className="section-wrap plan-inner"><div><span className="small-label">YOUR CITY, YOUR WAY</span><h2>A good plan leaves<br />room for <em>the unexpected.</em></h2></div><div className="plan-aside"><p>Tell us what you love. We’ll help you sketch a day that feels like yours, with local context at every turn.</p><Link className="button button-light" href="/plan-trip">Make a trip plan <ArrowRight size={16} /></Link><span className="coming-soon-label">A flexible first draft, shaped around you</span></div></div></section>

      <footer className="site-footer section-wrap"><Link className="brand" href="/"><span className="brand-mark">i</span><span>its us<span className="brand-period">.</span></span></Link><span>Made for getting a little lost.</span><span>HYDERABAD, INDIA · 2026</span></footer>
    </>
  );
}
