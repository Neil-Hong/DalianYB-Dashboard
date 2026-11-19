import SquadView, { squadTitle } from "@/views/SquadView";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("en", "/squad", squadTitle("en"));

export default function Page() {
  return <SquadView lang="en" />;
}
