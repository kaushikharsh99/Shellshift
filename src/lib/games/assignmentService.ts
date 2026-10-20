import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assignTeamQuestions } from "./assignments";

export async function getAssignedQuestions(eventId: string, userId: string) {
  const membership = await prisma.rosterMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: {
      id: true,
      teamId: true,
      team: {
        select: {
          members: { orderBy: { position: "asc" }, select: { id: true } },
        },
      },
    },
  });
  if (!membership) return [];
  const lineup = await prisma.eventChallenge.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    select: {
      challengeId: true,
      challenge: {
        select: { id: true, title: true, slug: true, difficulty: true },
      },
    },
  });
  const index = membership.team.members.findIndex(
    (m) => m.id === membership.id,
  );
  const ids = assignTeamQuestions(
    lineup.map((x) => x.challengeId),
    membership.team.members.length,
    `${eventId}:${membership.teamId}`,
  )[index];
  const byId = new Map(lineup.map((x) => [x.challengeId, x]));
  return ids.map((id, order) => ({ ...byId.get(id)!, order: order + 1 }));
}

export async function validateRosterQuestionPool(
  eventId: string,
  challengeCount: number,
  db: Pick<Prisma.TransactionClient, "competitionTeam"> = prisma,
) {
  const teams = await db.competitionTeam.findMany({
    where: { eventId },
    select: { _count: { select: { members: true } } },
  });
  const maxSize = Math.max(1, ...teams.map((t) => t._count.members));
  const required = 15 * Math.min(maxSize, 3);
  return challengeCount < required
    ? `Choose at least ${required} published questions to give every member 15 questions with the required overlap rules.`
    : null;
}
