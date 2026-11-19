import FixturesView from "@/views/FixturesView";
import { seasons, currentSeason } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
import { t } from "@/i18n";

type Props = { params: Promise<{ season: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return seasons.filter((s) => s !== currentSeason).map((season) => ({ season }));
}
export async function generateMetadata({ params }: Props) {
  const { season } = await params;
  return pageMetadata("zh", `/fixtures/${season}`, t("zh", "fixtures.title", { season }));
}

export default async function Page({ params }: Props) {
  const { season } = await params;
  return <FixturesView lang="zh" season={season} />;
}
