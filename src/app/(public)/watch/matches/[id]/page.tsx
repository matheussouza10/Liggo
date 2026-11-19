import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LiveMatch } from "@/components/public/live-match";
import { getPublicMatch } from "@/lib/competition/live-queries";

export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/watch/matches/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const m = await getPublicMatch(id);
  return m
    ? { title: `${m.home ?? "A definir"} x ${m.away ?? "A definir"} | Liggo` }
    : { title: "Jogo | Liggo" };
}

export default async function PublicMatchPage({
  params,
}: PageProps<"/watch/matches/[id]">) {
  await connection();
  const { id } = await params;
  const m = await getPublicMatch(id);
  if (!m) notFound();
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link
        href={`/watch/events/${m.eventId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground no-underline hover:text-white"
      >
        <ArrowLeftIcon className="size-4" />
        {m.eventName}
      </Link>
      <LiveMatch initial={m} />
    </div>
  );
}
