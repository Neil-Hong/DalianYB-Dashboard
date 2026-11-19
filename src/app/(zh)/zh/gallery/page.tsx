import GalleryView from "@/views/GalleryView";
import { pageMetadata } from "@/lib/seo";
import { t } from "@/i18n";

export const metadata = pageMetadata("zh", "/gallery", t("zh", "gallery.title"), t("zh", "gallery.description"));

export default function Page() {
  return <GalleryView lang="zh" />;
}
