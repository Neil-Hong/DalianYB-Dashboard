import type { NewsItem } from "../lib/news";
import { club } from "../lib/data";
import { cx } from "../lib/cx";
import { t, tr, fmtDateTime, type Lang } from "../i18n";
import "../styles/components/news-card.css";

interface Props { lang: Lang; item: NewsItem; compact?: boolean }

export default function NewsCard({ lang, item: n, compact = false }: Props) {
  const tags = n.tags.filter((tag) => tag !== "足球").map((tag) => tr(lang, "competitions", tag));
  return (
    <li className={cx("news", { compact })}>
      <a href={n.url} target="_blank" rel="noopener">
        <div className="thumb">
          {n.thumb
            ? <img src={n.thumb} alt="" loading="lazy" width={140} height={105} />
            : <span className="ph"><img src={club.logo} alt="" width={40} height={40} /></span>}
          {n.video && <span className="play" aria-label={t(lang, "news.video")}>▶</span>}
        </div>
        <div className="body">
          <h3 lang="zh-CN">{n.pinned && <span className="pin">{t(lang, "news.pinned")}</span>}{n.title}</h3>
          {n.note && <p className="note">{n.note}</p>}
          <p className="meta">
            <time dateTime={n.published_at ?? undefined}>{fmtDateTime(lang, n.published_at)}</time>
            {!compact && tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
            {n.comments ? <span>💬 {n.comments}</span> : null}
            <span className="src">懂球帝 ↗</span>
          </p>
        </div>
      </a>
    </li>
  );
}
