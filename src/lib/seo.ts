import type { Metadata } from "next";
import { club } from "./data";
import { t, href, type Lang } from "../i18n";

export const SITE_URL = "https://dalian-yingbo.pages.dev";

/**
 * Page metadata: "<title> · <club>", the club crest
 * as icon, no-referrer (the image CDN rejects hotlinks that send one) and hreflang alternates.
 * `path` is the language-neutral path, e.g. "/squad".
 */
export function pageMetadata(lang: Lang, path: string, title?: string, description?: string): Metadata {
  const clubName = lang === "zh" ? club.name_zh : club.name_en;
  const fullTitle = title ? `${title} · ${clubName}` : `${club.name_en} · ${club.name_zh}`;
  const desc = description ?? t(lang, "site.description");
  return {
    metadataBase: new URL(SITE_URL),
    title: fullTitle,
    description: desc,
    referrer: "no-referrer",
    icons: { icon: club.logo },
    alternates: {
      canonical: href(lang, path),
      languages: { en: href("en", path), "zh-CN": href("zh", path) },
    },
    openGraph: {
      title: fullTitle,
      description: desc,
      siteName: `${club.name_en} · ${club.name_zh}`,
      locale: lang === "zh" ? "zh_CN" : "en_GB",
      type: "website",
    },
  };
}
