import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const session = await getSession();
  if (!session)
    return Response.json({ authenticated: false, user: null }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      rosterEntries: {
        select: { eventId: true, team: { select: { id: true, name: true } } },
      },
    },
  });
  if (!user)
    return Response.json({ authenticated: false, user: null }, { status: 401 });
  const { rosterEntries, ...profile } = user;
  return Response.json({
    authenticated: true,
    user: {
      ...profile,
      teams: rosterEntries.map((e) => ({ eventId: e.eventId, ...e.team })),
    },
  });
}
