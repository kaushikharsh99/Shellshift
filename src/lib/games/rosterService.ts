import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { RosterTeamInput } from "./roster";

export async function createCompetitionRoster(
  tx: Prisma.TransactionClient,
  eventId: string,
  teams: RosterTeamInput[],
) {
  const created = await tx.competitionTeam.createManyAndReturn({
    data: teams.map((team) => ({ eventId, name: team.name })),
    select: { id: true, name: true },
  });
  const ids = new Map(created.map((team) => [team.name, team.id]));
  await tx.rosterMember.createMany({
    data: teams.flatMap((team) =>
      team.emails.map((email, position) => ({
        eventId,
        teamId: ids.get(team.name)!,
        email,
        position,
      })),
    ),
  });
}

export async function getRosterMembership(eventId: string, userId: string) {
  return prisma.rosterMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
    include: { team: { select: { id: true, name: true } } },
  });
}

export async function claimRosterMember(
  eventId: string,
  teamId: string,
  email: string,
  userId: string,
) {
  const normalized = email.trim().toLowerCase();
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
      const game = await tx.event.findUnique({
        where: { id: eventId },
        select: { status: true, endTime: true },
      });
      if (
        !game ||
        game.status !== "PUBLISHED" ||
        (game.endTime && game.endTime <= new Date())
      )
        return {
          error: "This competition is not accepting team joins.",
          status: 403,
        };
      const slot = await tx.rosterMember.findUnique({
        where: { eventId_email: { eventId, email: normalized } },
        include: { team: { select: { id: true, name: true } } },
      });
      if (!slot || slot.teamId !== teamId)
        return {
          error: "That email does not match the selected team's roster.",
          status: 400,
        };
      const enterCompetition = async () => {
        await tx.gameRegistration.upsert({
          where: { eventId_userId: { eventId, userId } },
          update: { status: "REGISTERED" },
          create: { eventId, userId },
        });
        return {
          team: slot.team,
          status: 200,
          destination: `/games/${eventId}/lobby`,
        };
      };
      if (slot.userId === userId) return enterCompetition();
      const existing = await tx.rosterMember.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      if (existing)
        return {
          error: "You have already joined a team for this competition.",
          status: 409,
        };
      const claimed = await tx.rosterMember.updateMany({
        where: { id: slot.id, userId: null },
        data: { userId, claimedAt: new Date() },
      });
      if (claimed.count !== 1)
        return {
          error: "This roster email has already been claimed.",
          status: 409,
        };
      return enterCompetition();
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return {
        error: "Your account or this roster email has already joined a team.",
        status: 409,
      };
    throw error;
  }
}

export async function importCompetitionRoster(
  eventId: string,
  teams: RosterTeamInput[],
) {
  return prisma.$transaction(async (tx) => {
    // Serialize roster replacements against claims and other imports for this event.
    await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
    const game = await tx.event.findUnique({
      where: { id: eventId },
      select: { status: true },
    });
    if (!game) return { error: "Competition not found.", status: 404 };
    const current = await tx.competitionTeam.findMany({
      where: { eventId },
      orderBy: { name: "asc" },
      include: {
        members: {
          orderBy: { position: "asc" },
          select: { email: true, userId: true },
        },
      },
    });
    const signature = (items: RosterTeamInput[]) =>
      JSON.stringify(
        [...items]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((t) => ({ name: t.name, emails: t.emails })),
      );
    if (
      signature(
        current.map((t) => ({
          name: t.name,
          emails: t.members.map((m) => m.email),
        })),
      ) === signature(teams)
    )
      return { success: true, status: 200 };
    if (
      game.status !== "DRAFT" ||
      current.some((t) => t.members.some((m) => m.userId))
    )
      return {
        error: "Rosters can only be changed on unclaimed draft competitions.",
        status: 409,
      };
    await tx.competitionTeam.deleteMany({ where: { eventId } });
    await createCompetitionRoster(tx, eventId, teams);
    return { success: true, status: 200 };
  });
}
