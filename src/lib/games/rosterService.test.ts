import { publishGame, transitionGameStatus } from "./service";
import { getAssignedQuestions } from "./assignmentService";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  claimRosterMember,
  createCompetitionRoster,
  importCompetitionRoster,
} from "./rosterService";
import { getGameStandings } from "./standings";
import { registerUserForGame } from "./registration";

// Opt-in: this suite writes fictional data and must never run on the configured production DB.
describe.skipIf(process.env.ROSTER_INTEGRATION !== "true")(
  "roster integration",
  () => {
    const suffix = randomUUID();
    let eventId: string,
      teamId: string,
      otherTeamId: string,
      userId: string,
      otherUserId: string;
    beforeAll(async () => {
      if (!process.env.DATABASE_URL?.includes("127.0.0.1"))
        throw new Error(
          "Roster integration requires an isolated local database.",
        );
      const users = await Promise.all(
        ["a", "b"].map((key) =>
          prisma.user.create({
            data: {
              oidcIssuer: "roster-test",
              oidcSub: suffix + key,
              name: `Test ${key}`,
            },
          }),
        ),
      );
      [userId, otherUserId] = users.map((u) => u.id);
      const event = await prisma.event.create({
        data: {
          name: `Roster ${suffix}`,
          status: "PUBLISHED",
          registrationOpensAt: new Date(Date.now() - 10000),
          registrationClosesAt: new Date(Date.now() + 100000),
          endTime: new Date(Date.now() + 1000000),
        },
      });
      eventId = event.id;
      await prisma.$transaction((tx) =>
        createCompetitionRoster(tx, eventId, [
          { name: "Duo", emails: ["first@example.com", "second@example.com"] },
          { name: "Solo", emails: ["solo@example.com"] },
        ]),
      );
      teamId = (
        await prisma.competitionTeam.findFirstOrThrow({
          where: { eventId, name: "Duo" },
        })
      ).id;
      otherTeamId = (
        await prisma.competitionTeam.findFirstOrThrow({
          where: { eventId, name: "Solo" },
        })
      ).id;
    });
    afterAll(async () => {
      if (eventId) await prisma.event.delete({ where: { id: eventId } });
      if (userId)
        await prisma.user.deleteMany({
          where: { id: { in: [userId, otherUserId] } },
        });
    });
    it("rejects nonroster registration and wrong-team email", async () => {
      expect((await registerUserForGame(eventId, userId)).status).toBe(403);
      expect(
        (
          await claimRosterMember(
            eventId,
            otherTeamId,
            "first@example.com",
            userId,
          )
        ).status,
      ).toBe(400);
      expect(
        await prisma.rosterMember.count({ where: { eventId, userId } }),
      ).toBe(0);
    });
    it("serializes competing claims and permits only one account per slot", async () => {
      const result = await Promise.all([
        claimRosterMember(eventId, teamId, " FIRST@example.com ", userId),
        claimRosterMember(eventId, teamId, "first@example.com", otherUserId),
      ]);
      expect(result.map((r) => r.status).sort()).toEqual([200, 409]);
      const slot = await prisma.rosterMember.findUniqueOrThrow({
        where: { eventId_email: { eventId, email: "first@example.com" } },
      });
      const winner = slot.userId!;
      const loser = winner === userId ? otherUserId : userId;
      expect(
        (await claimRosterMember(eventId, teamId, "first@example.com", winner))
          .status,
      ).toBe(200);
      expect(
        (await claimRosterMember(eventId, teamId, "second@example.com", winner))
          .status,
      ).toBe(409);
      expect(
        (await claimRosterMember(eventId, teamId, "second@example.com", loser))
          .status,
      ).toBe(200);
      expect(
        await prisma.gameRegistration.count({
          where: { eventId, userId: winner, status: "REGISTERED" },
        }),
      ).toBe(1);
      expect(
        await claimRosterMember(eventId, teamId, "first@example.com", winner),
      ).toHaveProperty("destination", `/games/${eventId}/lobby`);
      expect(
        await prisma.gameRegistration.count({
          where: { eventId, userId: winner },
        }),
      ).toBe(1);
      expect((await registerUserForGame(eventId, winner)).status).toBe(200);
    });
    it("includes unplayed roster members and does not disclose emails", async () => {
      const standings = await getGameStandings(eventId);
      expect(standings.teamStandings.map((t) => t.memberCount).sort()).toEqual([
        1, 2,
      ]);
      expect(standings.teamStandings.every((t) => t.totalScore === 0)).toBe(
        true,
      );
      expect(JSON.stringify(standings)).not.toContain("@example.com");
    });
    it("averages persisted independent runs and ignores a lower repeat score", async () => {
      const challenge = await prisma.challenge.create({
        data: {
          slug: `roster-score-${suffix}`,
          title: "Roster score fixture",
          description: "Fictional test",
          commandMappings: "{}",
          clues: "[]",
          initialFilesystem: "{}",
          objectiveConfig: "{}",
        },
      });
      try {
        for (const [account, score] of [
          [userId, 100],
          [userId, 40],
          [otherUserId, 80],
        ] as const)
          await prisma.run.create({
            data: {
              eventId,
              rosterTeamId: teamId,
              userId: account,
              challengeId: challenge.id,
              status: "COMPLETED",
              finalScore: score,
              filesystemState: "{}",
              completedAt: new Date(),
              durationMs: 100,
            },
          });
        const result = await getGameStandings(eventId);
        expect(
          result.teamStandings.find((t) => t.teamId === teamId)?.totalScore,
        ).toBe(90);
        expect(result.standings.map((p) => p.totalScore)).toEqual([100, 80]);
        expect(
          result.teamStandings.find((t) => t.teamId === otherTeamId)
            ?.totalScore,
        ).toBe(0);
      } finally {
        await prisma.challenge.delete({ where: { id: challenge.id } });
      }
    });
    it("loads stable disjoint fifteen-question sets from roster positions", async () => {
      const catalog = await prisma.challenge.findMany({
        where: { isPublished: true },
        orderBy: { id: "asc" },
        take: 50,
        select: { id: true },
      });
      expect(catalog.length).toBe(50);
      await prisma.eventChallenge.createMany({
        data: catalog.map((challenge, order) => ({
          eventId,
          challengeId: challenge.id,
          order,
        })),
      });
      const first = await getAssignedQuestions(eventId, userId);
      const second = await getAssignedQuestions(eventId, otherUserId);
      expect(first.length).toBe(15);
      expect(second.length).toBe(15);
      expect(
        new Set([...first, ...second].map((q) => q.challengeId)).size,
      ).toBe(30);
      expect(
        (await getAssignedQuestions(eventId, userId)).map((q) => q.challengeId),
      ).toEqual(first.map((q) => q.challengeId));
      expect(first.map((q) => q.order)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      ]);
    });
    it("allows identical imports but locks published roster changes", async () => {
      expect(
        (
          await importCompetitionRoster(eventId, [
            {
              name: "Duo",
              emails: ["first@example.com", "second@example.com"],
            },
            { name: "Solo", emails: ["solo@example.com"] },
          ])
        ).status,
      ).toBe(200);
      expect(
        (
          await importCompetitionRoster(eventId, [
            { name: "Changed", emails: ["changed@example.com"] },
          ])
        ).status,
      ).toBe(409);
      expect(await prisma.competitionTeam.count({ where: { eventId } })).toBe(
        2,
      );
    });
    it("cannot bypass publication requirements or reopen published assignments", async () => {
      const draft = await prisma.event.create({
        data: { name: `Status gate ${suffix}` },
      });
      try {
        const result = await transitionGameStatus(
          draft.id,
          "PUBLISHED",
          userId,
        );
        expect(result).toHaveProperty("error");
        expect(
          (await prisma.event.findUniqueOrThrow({ where: { id: draft.id } }))
            .status,
        ).toBe("DRAFT");
        expect(
          await transitionGameStatus(eventId, "DRAFT", userId),
        ).toHaveProperty("error");
        expect(
          (await prisma.event.findUniqueOrThrow({ where: { id: eventId } }))
            .status,
        ).toBe("PUBLISHED");
      } finally {
        await prisma.event.delete({ where: { id: draft.id } });
      }
    });
    it("rejects a hidden question even when enough other published questions are selected", async () => {
      const hidden = await prisma.challenge.create({
        data: {
          slug: `hidden-pool-${suffix}`,
          title: "Hidden fixture",
          description: "Fictional test",
          isPublished: false,
          commandMappings: "{}",
          clues: "[]",
          initialFilesystem: "{}",
          objectiveConfig: "{}",
        },
      });
      const draft = await prisma.event.create({
        data: {
          name: `Hidden pool ${suffix}`,
          registrationOpensAt: new Date(Date.now() - 10000),
          registrationClosesAt: new Date(Date.now() + 10000),
          startTime: new Date(Date.now() + 20000),
          endTime: new Date(Date.now() + 100000),
        },
      });
      try {
        const published = await prisma.challenge.findMany({
          where: { isPublished: true },
          take: 15,
          select: { id: true },
        });
        await prisma.$transaction((tx) =>
          createCompetitionRoster(tx, draft.id, [
            { name: "Solo", emails: ["test@example.com"] },
          ]),
        );
        await prisma.eventChallenge.createMany({
          data: [...published, hidden].map((challenge, order) => ({
            eventId: draft.id,
            challengeId: challenge.id,
            order,
          })),
        });
        const result = await publishGame(draft.id, userId);
        expect(result).toHaveProperty(
          "fieldErrors.challengeIds",
          "Remove hidden questions before publishing this competition.",
        );
        expect(
          (await prisma.event.findUniqueOrThrow({ where: { id: draft.id } }))
            .status,
        ).toBe("DRAFT");
      } finally {
        await prisma.event.delete({ where: { id: draft.id } });
        await prisma.challenge.delete({ where: { id: hidden.id } });
      }
    });
    it("rolls back all roster rows on uniqueness failure", async () => {
      const draft = await prisma.event.create({
        data: { name: `Rollback ${suffix}` },
      });
      try {
        await expect(
          prisma.$transaction((tx) =>
            createCompetitionRoster(tx, draft.id, [
              { name: "One", emails: ["dupe@example.com"] },
              { name: "Two", emails: ["dupe@example.com"] },
            ]),
          ),
        ).rejects.toThrow();
        expect(
          await prisma.competitionTeam.count({ where: { eventId: draft.id } }),
        ).toBe(0);
      } finally {
        await prisma.event.delete({ where: { id: draft.id } });
      }
    });
  },
);
