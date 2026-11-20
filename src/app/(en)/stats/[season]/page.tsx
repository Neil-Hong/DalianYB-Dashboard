import StatsView, { statsTitle } from "@/views/StatsView";
import { currentSeason } from "@/lib/data";
import { statSeasons } from "@/lib/stats";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ season: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return statSeasons.filter((s) => s !== currentSeason).map((season) => ({ season }));
}
export async function generateMetadata({ params }: Props) {
  const { season } = await params;
  return pageMetadata("en", `/stats/${season}`, statsTitle("en", season));
}

export default async function Page({ params }: Props) {
  const { season } = await params;
  return <StatsView lang="en" season={season} />;
}
