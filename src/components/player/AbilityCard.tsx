/**
 * Dongqiudi's overall rating (能力值) as an animated radar chart.
 * Values come straight from the saved player page; nothing is estimated.
 */
import type { Ability } from "../../lib/data";
import { cx, vars } from "../../lib/cx";
import { t, type Lang, type UIKey } from "../../i18n";
import AbilityClient from "../../client/AbilityClient";
import "../../styles/components/ability-card.css";

interface Props { lang: Lang; ability: Ability | null | undefined }

const R = 92; // radius of the 100 ring
const RINGS = [20, 40, 60, 80, 100];
const GAUGE_R = 46;
const GAUGE_C = 2 * Math.PI * GAUGE_R;

export default function AbilityCard({ lang, ability }: Props) {
  const attrs = ability?.attributes ?? [];
  const n = attrs.length || 6;
  const angle = (i: number) => (-90 + (i * 360) / n) * (Math.PI / 180);
  const pt = (i: number, v: number) => [Math.cos(angle(i)) * R * v / 100, Math.sin(angle(i)) * R * v / 100];
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).map((x) => x.toFixed(2)).join(",")).join(" ");

  const label = (key: string, zh: string) => {
    const k = `ability.${key}` as UIKey;
    const s = t(lang, k);
    return s === k ? zh : s;
  };
  const labels = attrs.map((a, i) => {
    const [x, y] = pt(i, 128);
    const c = Math.cos(angle(i));
    return { ...a, text: label(a.key, a.label_zh), x, y, anchor: (Math.abs(c) < 0.2 ? "middle" : c > 0 ? "start" : "end") as "middle" | "start" | "end" };
  });
  const starRows = (["reputation", "weak_foot", "skill_moves"] as const)
    .filter((k) => ability?.stars?.[k] != null)
    .map((k) => ({ key: k, text: t(lang, `ability.${k}` as UIKey), n: ability!.stars[k]! }));

  return (
    <section className="card ab" data-ability={ability ? JSON.stringify({ overall: ability.overall, values: attrs.map((a) => a.value) }) : undefined}>
      <div className="ab-head">
        <h2>{t(lang, "player.ability")}</h2>
        {ability && <span className="ab-note">{t(lang, "player.abilityNote")}</span>}
      </div>

      {ability ? (
        <div className="ab-body">
          <div className="ab-side">
            <div className="gauge" role="img" aria-label={`${t(lang, "player.ability")}: ${ability.overall}`}>
              <svg viewBox="-60 -60 120 120" aria-hidden="true">
                <defs>
                  <linearGradient id="ab-gold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fff0b8" /><stop offset=".55" stopColor="#e8b423" /><stop offset="1" stopColor="#a87a0c" />
                  </linearGradient>
                </defs>
                <circle r={GAUGE_R} className="gauge-track" />
                <circle r={GAUGE_R} className="gauge-arc" stroke="url(#ab-gold)"
                  strokeDasharray={GAUGE_C.toFixed(2)} strokeDashoffset={(GAUGE_C * (1 - ability.overall / 100)).toFixed(2)}
                  data-c={GAUGE_C.toFixed(2)} transform="rotate(-90)" />
              </svg>
              <span className="gauge-num">{ability.overall}</span>
              <span className="gauge-cap">OVR</span>
            </div>
            {starRows.length > 0 && (
              <dl className="stars">
                {starRows.map((r) => (
                  <div key={r.key}>
                    <dt>{r.text}</dt>
                    <dd aria-label={`${r.n} / 5`}>
                      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={cx("st", { on: i <= r.n })} style={vars({ "--i": i })}>★</span>)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="radar-wrap">
            <svg className="radar" viewBox="-170 -150 340 300" role="img" aria-label={labels.map((l) => `${l.text} ${l.value}`).join(", ")}>
              <defs>
                <radialGradient id="ab-fill" r="1">
                  <stop offset="0" stopColor="#ffe27a" stopOpacity=".25" />
                  <stop offset="1" stopColor="#e8b423" stopOpacity=".55" />
                </radialGradient>
                <filter id="ab-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <g className="web">
                {RINGS.map((r) => <polygon key={r} className={cx("ring", { outer: r === 100 })} points={poly(Array(n).fill(r))} />)}
                {attrs.map((a, i) => { const [x, y] = pt(i, 100); return <line key={a.key} x1="0" y1="0" x2={x.toFixed(2)} y2={y.toFixed(2)} />; })}
              </g>
              <polygon className="shape" points={poly(attrs.map((a) => a.value))} filter="url(#ab-glow)" />
              <g className="dots">
                {attrs.map((a, i) => { const [x, y] = pt(i, a.value); return <circle key={a.key} r="3.6" cx={x.toFixed(2)} cy={y.toFixed(2)} />; })}
              </g>
              <g className="labels">
                {labels.map((l, i) => (
                  <text key={l.key} x={l.x.toFixed(1)} y={l.y.toFixed(1)} textAnchor={l.anchor} style={vars({ "--i": i })}>
                    <tspan className="lv" x={l.x.toFixed(1)} dy="-0.15em">{l.value}</tspan>
                    <tspan className="lt" x={l.x.toFixed(1)} dy="1.25em">{l.text}</tspan>
                  </text>
                ))}
              </g>
            </svg>
          </div>
          <AbilityClient />
        </div>
      ) : (
        <div className="ab-empty">
          <svg viewBox="-110 -110 220 220" aria-hidden="true">
            {RINGS.map((r) => <polygon key={r} points={poly(Array(6).fill(r))} />)}
          </svg>
          <p>{t(lang, "player.abilityNone")}</p>
        </div>
      )}
    </section>
  );
}
