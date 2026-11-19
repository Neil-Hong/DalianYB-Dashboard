import NewsView, { newsTitle } from "@/views/NewsView";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("zh", "/news", newsTitle("zh"));

export default function Page() {
  return <NewsView lang="zh" />;
}
