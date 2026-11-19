import TableView, { tableTitle } from "@/views/TableView";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("zh", "/table", tableTitle("zh"));

export default function Page() {
  return <TableView lang="zh" />;
}
