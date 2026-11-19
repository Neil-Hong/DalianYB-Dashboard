import type { ReactNode } from "react";
import { RootDocument } from "@/components/layout/RootDocument";

/** Root layout for the English site (served at /). */
export default function Layout({ children }: { children: ReactNode }) {
  return <RootDocument lang="en">{children}</RootDocument>;
}
