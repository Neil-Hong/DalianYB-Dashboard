import { vars } from "../../lib/cx";
import "../../styles/components/club-badge.css";

/** Club crest, or a lettered disc when dongqiudi has no logo for that club. */
export default function ClubBadge({ logo, name, size = 28 }: { logo?: string | null; name: string; size?: number }) {
  const initial = [...(name || "?")][0];
  return logo
    ? <img className="club-badge" src={logo} alt="" loading="lazy" width={size} height={size} style={vars({ "--s": `${size}px` })} />
    : <span className="club-badge none" style={vars({ "--s": `${size}px` })} aria-hidden="true">{initial}</span>;
}
