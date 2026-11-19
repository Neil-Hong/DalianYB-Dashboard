import GalleryView from "@/views/GalleryView";
import { pageMetadata } from "@/lib/seo";
import { t } from "@/i18n";

export const metadata = pageMetadata("en", "/gallery", t("en", "gallery.title"), t("en", "gallery.description"));

export default function Page() {
  return <GalleryView lang="en" />;
}
