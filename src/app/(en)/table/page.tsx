import TableView, { tableTitle } from "@/views/TableView";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("en", "/table", tableTitle("en"));

export default function Page() {
  return <TableView lang="en" />;
}
