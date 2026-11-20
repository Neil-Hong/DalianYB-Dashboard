import StatsView, { statsTitle } from "@/views/StatsView";
import { currentSeason } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("en", "/stats", statsTitle("en", currentSeason));

export default function Page() {
  return <StatsView lang="en" season={currentSeason} />;
}
