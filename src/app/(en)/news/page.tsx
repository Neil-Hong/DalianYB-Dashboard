import NewsView, { newsTitle } from "@/views/NewsView";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("en", "/news", newsTitle("en"));

export default function Page() {
  return <NewsView lang="en" />;
}
