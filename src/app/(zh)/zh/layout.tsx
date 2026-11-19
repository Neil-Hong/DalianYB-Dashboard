import type { ReactNode } from "react";
import { RootDocument } from "@/components/layout/RootDocument";

/** Root layout for the Chinese site (served under /zh). */
export default function Layout({ children }: { children: ReactNode }) {
  return <RootDocument lang="zh">{children}</RootDocument>;
}
