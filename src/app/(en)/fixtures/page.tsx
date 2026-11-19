import FixturesView from "@/views/FixturesView";
import { currentSeason } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
import { t } from "@/i18n";

export const metadata = pageMetadata("en", "/fixtures", t("en", "fixtures.title", { season: currentSeason }));

export default function Page() {
  return <FixturesView lang="en" season={currentSeason} />;
}
