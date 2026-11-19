import NewsView, { newsTitle } from "@/views/NewsView";
import { newsMonths } from "@/lib/news";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ month: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return newsMonths.filter((m) => m !== "unknown").map((month) => ({ month }));
}
export async function generateMetadata({ params }: Props) {
  const { month } = await params;
  return pageMetadata("zh", `/news/${month}`, newsTitle("zh", month));
}

export default async function Page({ params }: Props) {
  const { month } = await params;
  return <NewsView lang="zh" month={month} />;
}
