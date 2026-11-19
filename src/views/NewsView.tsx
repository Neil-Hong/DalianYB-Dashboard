import Shell from "../components/layout/Shell";
import NewsCard from "../components/NewsCard";
import { news, pinnedNews, newsMonths, monthOf, type NewsItem } from "../lib/news";
import { cx } from "../lib/cx";
import { t, href, fmtDay, fmtYearMonth, type Lang } from "../i18n";
import "../styles/components/news.css";

const LATEST = 40;

export function newsTitle(lang: Lang, month?: string) {
  return month ? t(lang, "news.month", { month: fmtYearMonth(lang, month) }) : t(lang, "news.title");
}

export default function NewsView({ lang, month }: { lang: Lang; month?: string }) {
  const items: NewsItem[] = month
    ? news.filter((n) => monthOf(n.published_at) === month)
    : news.filter((n) => !n.pinned).slice(0, LATEST);
  const byDay = new Map<string, NewsItem[]>();
  for (const n of items) {
    const day = n.published_at ? fmtDay(lang, n.published_at) : t(lang, "news.unknownDate");
    byDay.set(day, [...(byDay.get(day) ?? []), n]);
  }
  const zhNote = t(lang, "news.zhNote");

  return (
    <Shell lang={lang} path={month ? `/news/${month}` : "/news"}>
      <div className="v-news">
        <div className="wrap">
          <header className="page-head">
            <p className="eyebrow">{t(lang, "news.eyebrow")}</p>
            <h1>{newsTitle(lang, month)}</h1>
            <p className="sub">{t(lang, "news.sub", { n: news.length })} {zhNote}</p>
            {newsMonths.length > 0 && (
              <nav className="months" aria-label="Months">
                <a href={href(lang, "/news")} className={cx({ active: !month }) || undefined}>{t(lang, "news.latest")}</a>
                {newsMonths.map((m) => <a key={m} href={href(lang, `/news/${m}`)} className={cx({ active: m === month }) || undefined}>{fmtYearMonth(lang, m)}</a>)}
              </nav>
            )}
          </header>
          {!month && pinnedNews.length > 0 && (
            <section className="day">
              <h2>{t(lang, "news.pinned")}</h2>
              <ul className="card feed">{pinnedNews.map((n) => <NewsCard key={n.id} lang={lang} item={n} />)}</ul>
            </section>
          )}
          {items.length === 0 && <p className="empty">{t(lang, "news.empty")}</p>}
          {[...byDay].map(([day, list]) => (
            <section key={day} className="day">
              <h2>{day}</h2>
              <ul className="card feed">{list.map((n) => <NewsCard key={n.id} lang={lang} item={n} />)}</ul>
            </section>
          ))}
          {!month && news.length > LATEST + pinnedNews.length && <p className="more">{t(lang, "news.older")}</p>}
        </div>
      </div>
    </Shell>
  );
}
