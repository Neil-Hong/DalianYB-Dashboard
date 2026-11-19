import { notFound } from "next/navigation";
import PlayerView from "@/views/PlayerView";
import { squad, club, personName } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };
const find = (id: string) => squad.players.find((p) => p.id === id);

export const dynamicParams = false;
export function generateStaticParams() {
  return squad.players.map((p) => ({ id: p.id }));
}
export async function generateMetadata({ params }: Props) {
  const player = find((await params).id);
  if (!player) return {};
  const name = personName("zh", player);
  return pageMetadata("zh", `/players/${player.id}`, name, `${name} · ${club.name_zh}`);
}

export default async function Page({ params }: Props) {
  const player = find((await params).id);
  if (!player) notFound();
  return <PlayerView lang="zh" player={player} />;
}
