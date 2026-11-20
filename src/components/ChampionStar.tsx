/**
 * Faceted gold star for the champions' crest, drawn like the star in the homepage intro:
 * each point is two triangles (a lit and a shaded face) meeting at a ridge from the centre.
 */
const OUTER = 48;
const INNER = 20;

const vertex = (i: number, r: number) => {
  const a = (-90 + i * 36) * (Math.PI / 180);
  return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
};

export default function ChampionStar({ title }: { title: string }) {
  // even indices are tips, odd indices are the notches between them
  const faces = Array.from({ length: 5 }, (_, p) => {
    const tip = vertex(p * 2, OUTER);
    return [
      { points: `0,0 ${vertex(p * 2 - 1, INNER)} ${tip}`, lit: true },
      { points: `0,0 ${tip} ${vertex(p * 2 + 1, INNER)}`, lit: false },
    ];
  }).flat();

  return (
    <svg className="champion-star" viewBox="-52 -52 104 104" role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <linearGradient id="cs-lit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff6cf" /><stop offset=".55" stopColor="#f2c94c" /><stop offset="1" stopColor="#d9a21c" />
        </linearGradient>
        <linearGradient id="cs-shade" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2ae2c" /><stop offset=".6" stopColor="#b8820f" /><stop offset="1" stopColor="#8a5f08" />
        </linearGradient>
      </defs>
      {faces.map((f, i) => (
        <polygon key={i} points={f.points} fill={f.lit ? "url(#cs-lit)" : "url(#cs-shade)"} />
      ))}
      <polygon className="cs-glint" points={Array.from({ length: 10 }, (_, i) => vertex(i, i % 2 ? INNER : OUTER)).join(" ")} />
    </svg>
  );
}
