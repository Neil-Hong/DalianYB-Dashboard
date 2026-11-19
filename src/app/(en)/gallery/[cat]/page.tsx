import GalleryCategoryView, { exhibitionTitle } from "@/views/GalleryCategoryView";
import { CATEGORIES, type Category } from "@/lib/gallery";
import { pageMetadata } from "@/lib/seo";
import { t } from "@/i18n";

type Props = { params: Promise<{ cat: Category }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ cat }));
}
export async function generateMetadata({ params }: Props) {
  const { cat } = await params;
  return pageMetadata("en", `/gallery/${cat}`, exhibitionTitle("en", cat), t("en", "gallery.description"));
}

export default async function Page({ params }: Props) {
  const { cat } = await params;
  return <GalleryCategoryView lang="en" cat={cat} />;
}
