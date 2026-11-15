import { ArrowUpRight, Clock3, MapPin } from "lucide-react";

type ExperienceCardProps = {
  title: string;
  area: string;
  duration: string;
  category: string;
  tone: "terracotta" | "olive" | "blue";
  number: string;
};

export function ExperienceCard({ title, area, duration, category, tone, number }: ExperienceCardProps) {
  return (
    <article className={`experience-card tone-${tone}`}>
      <div className="card-art" aria-hidden="true">
        <span className="card-number">{number}</span><span className="demo-mark">DEMO</span>
        <div className="art-sun" /><div className="art-arch arch-back" /><div className="art-arch arch-front" />
        <span className="art-caption">{category}</span>
      </div>
      <div className="card-copy">
        <div className="card-title-row"><h3>{title}</h3><ArrowUpRight size={17} /></div>
        <div className="card-meta"><span><MapPin size={13} />{area}</span><span><Clock3 size={13} />{duration}</span></div>
      </div>
    </article>
  );
}
