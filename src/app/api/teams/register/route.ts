import { getSession } from "@/lib/auth/session";
import { claimRosterMember } from "@/lib/games/rosterService";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Sign in first." }, { status: 401 });
  if (!rateLimit(`roster-join:${session.id}`, 10, 60_000).success)
    return Response.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429 },
    );
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const { eventId, teamId, email } = body ?? {};
  if (
    typeof eventId !== "string" ||
    typeof teamId !== "string" ||
    typeof email !== "string" ||
    email.length > 254 ||
    !email.trim()
  )
    return Response.json(
      { error: "Choose a competition, team, and roster email." },
      { status: 400 },
    );
  const result = await claimRosterMember(eventId, teamId, email, session.id);
  return Response.json(result, { status: result.status });
}
