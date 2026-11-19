import SquadView, { squadTitle } from "@/views/SquadView";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("zh", "/squad", squadTitle("zh"));

export default function Page() {
  return <SquadView lang="zh" />;
}
