import { getAssignedQuestions } from "./assignmentService";

type LineupItem = {
  challengeId: string;
  order: number;
  challenge: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
    isPublished: boolean;
  };
};

export type NextChallenge = {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  order: number;
};

export function selectNextAssignedChallenge(
  lineup: LineupItem[],
  currentChallengeId: string,
  userId: string,
  memberIds: string[],
): NextChallenge | null {
  const currentIndex = lineup.findIndex((item) => item.challengeId === currentChallengeId);
  if (currentIndex < 0) return null;

  const sortedMemberIds = [...memberIds].sort();
  const memberIndex = sortedMemberIds.indexOf(userId);
  const memberCount = sortedMemberIds.length;
  if (memberCount > 1 && memberIndex >= 0 && currentIndex % memberCount !== memberIndex) {
    return null;
  }

  for (let index = currentIndex + 1; index < lineup.length; index++) {
    if (memberCount > 1 && memberIndex >= 0 && index % memberCount !== memberIndex) continue;
    const item = lineup[index];
    if (!item.challenge.isPublished) continue;
    return {
      id: item.challenge.id,
      title: item.challenge.title,
      slug: item.challenge.slug,
      difficulty: item.challenge.difficulty,
      order: item.order,
    };
  }
  return null;
}

export async function getNextGameChallenge(run: {
  eventId: string | null;
  userId: string | null;
  challengeId: string;
}): Promise<NextChallenge | null> {
  if (!run.eventId || !run.userId) return null;

  const assigned = await getAssignedQuestions(run.eventId, run.userId);
  const currentIndex = assigned.findIndex((item) => item.challengeId === run.challengeId);
  if (currentIndex < 0) return null;
  const next = assigned[currentIndex + 1];
  if (!next) return null;
  return { ...next.challenge, order: next.order };
}
