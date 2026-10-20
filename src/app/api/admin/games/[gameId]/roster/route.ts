import { getSession } from "@/lib/auth/session";
import { parseRosterCsv } from "@/lib/games/roster";
import { importCompetitionRoster } from "@/lib/games/rosterService";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const user = await getSession();
  if (user?.role !== "ADMIN")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.rosterCsv !== "string")
    return Response.json({ error: "Upload a CSV file." }, { status: 400 });
  const roster = parseRosterCsv(body.rosterCsv);
  if (roster.errors.length)
    return Response.json({ error: roster.errors.join(" ") }, { status: 400 });
  const { gameId } = await params;
  const result = await importCompetitionRoster(gameId, roster.teams);
  return Response.json(result, { status: result.status });
}
