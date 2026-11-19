import { getPublicMatch } from "@/lib/competition/live-queries";

// Polled every few seconds by the live page. A short shared cache lets a CDN
// absorb many viewers of the same match.
export async function GET(
  _request: Request,
  { params }: RouteContext<"/watch/api/matches/[id]">,
) {
  const { id } = await params;
  const snapshot = await getPublicMatch(id);
  if (!snapshot) {
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=2, stale-while-revalidate=3",
    },
  });
}
