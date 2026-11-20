import StatsView, { statsTitle } from "@/views/StatsView";
import { currentSeason } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("zh", "/stats", statsTitle("zh", currentSeason));

export default function Page() {
  return <StatsView lang="zh" season={currentSeason} />;
}
