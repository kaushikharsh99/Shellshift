import { createHash } from "node:crypto";
export const QUESTIONS_PER_MEMBER = 15;

function shuffle<T>(values: T[], seed: string): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const hash = createHash("sha256").update(`${seed}:${i}`).digest();
    const j = hash.readUInt32BE(0) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function assignTeamQuestions(
  challengeIds: string[],
  size: number,
  seed: string,
): string[][] {
  if (!Number.isInteger(size) || size < 1 || size > 4)
    throw new Error("Teams must have one to four members.");
  const pool = shuffle([...new Set(challengeIds)], `${seed}:pool`);
  const required = QUESTIONS_PER_MEMBER * Math.min(size, 3);
  if (pool.length < required)
    throw new Error(
      `This roster needs at least ${required} questions in the competition lineup.`,
    );
  const sets = Array.from({ length: size }, () => [] as string[]);
  // Deal unique questions evenly, so no member gets most of the repeated placements.
  const initial = pool.slice(
    0,
    Math.min(pool.length, size * QUESTIONS_PER_MEMBER),
  );
  initial.forEach((id, i) => sets[i % size].push(id));
  const uses = new Map(initial.map((id) => [id, 1]));
  for (let member = 0; member < size; member++) {
    const candidates = shuffle(pool, `${seed}:fill:${member}`);
    while (sets[member].length < QUESTIONS_PER_MEMBER) {
      const available = candidates.filter((id) => !sets[member].includes(id));
      const lowest = Math.min(...available.map((id) => uses.get(id) || 0));
      const id = available.find((id) => (uses.get(id) || 0) === lowest)!;
      sets[member].push(id);
      uses.set(id, (uses.get(id) || 0) + 1);
    }
  }
  return sets.map((set, member) => shuffle(set, `${seed}:order:${member}`));
}
