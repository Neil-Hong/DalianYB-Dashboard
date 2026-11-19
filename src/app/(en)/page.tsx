import HomeView from "@/views/HomeView";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("en", "/");

export default function Page() {
  return <HomeView lang="en" />;
}
