import { parseRosterCsv } from "@/lib/games/roster";
import { createCompetitionRoster } from "@/lib/games/rosterService";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return Response.json(
      { error: "Forbidden. Admin access required." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      durationMinutes = 30,
      challengeIds = [],
      timezone = "UTC",
      visibility = "PUBLIC",
    } = body;

    const roster = parseRosterCsv(
      typeof body.rosterCsv === "string" ? body.rosterCsv : "",
    );
    if (roster.errors.length)
      return Response.json({ error: roster.errors.join(" ") }, { status: 400 });

    const parsedDuration = Math.max(
      5,
      Math.min(1440, Number(durationMinutes) || 30),
    );

    const gameName =
      name?.trim() ||
      `Live Sprint - ${parsedDuration}m (${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })})`;

    // Generate unique slug
    let baseSlug = gameName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!baseSlug) baseSlug = `live-sprint-${parsedDuration}m`;

    let slug = baseSlug;
    const existing = await prisma.event.findFirst({ where: { slug } });
    if (existing) {
      slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Determine challenges to include
    let selectedChallengeIds: string[] = Array.isArray(challengeIds)
      ? challengeIds
      : [];
    if (selectedChallengeIds.length === 0) {
      const allPublished = await prisma.challenge.findMany({
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      selectedChallengeIds = allPublished.map((c) => c.id);
    }

    if (selectedChallengeIds.length === 0) {
      return Response.json(
        {
          error:
            "No published challenges available to include in this competition.",
        },
        { status: 400 },
      );
    }

    const required =
      15 *
      Math.min(3, Math.max(...roster.teams.map((team) => team.emails.length)));
    const publishedCount = await prisma.challenge.count({
      where: { id: { in: selectedChallengeIds }, isPublished: true },
    });
    if (
      publishedCount !== selectedChallengeIds.length ||
      publishedCount < required
    )
      return Response.json(
        {
          error: `Choose at least ${required} published questions for this roster.`,
        },
        { status: 400 },
      );

    // Calculate timestamps to make it instantly LIVE
    const now = Date.now();
    const registrationOpensAt = new Date(now - 2 * 60 * 1000);
    const registrationClosesAt = new Date(now - 15 * 1000);
    const startsAt = new Date(now - 5 * 1000);
    const endsAt = new Date(now + parsedDuration * 60 * 1000);

    const game = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          name: gameName,
          slug,
          description: `Live timed competition running for ${parsedDuration} minutes.`,
          timezone,
          visibility,
          leaderboardVisibility: "LIVE",
          status: "PUBLISHED",
          registrationOpensAt,
          registrationClosesAt,
          startTime: startsAt,
          endTime: endsAt,
        },
      });

      await createCompetitionRoster(tx, newEvent.id, roster.teams);
      await tx.eventChallenge.createMany({
        data: selectedChallengeIds.map((challengeId, order) => ({
          eventId: newEvent.id,
          challengeId,
          order,
        })),
      });

      await tx.auditLog.create({
        data: {
          userId: session.id,
          action: "GAME_PUBLISHED",
          details: JSON.stringify({
            eventId: newEvent.id,
            mode: "INSTANT_LIVE",
            durationMinutes: parsedDuration,
          }),
        },
      });

      return newEvent;
    });

    return Response.json(
      {
        game,
        message: `Live game launched for ${parsedDuration} minutes!`,
      },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("Instant live game error:", err);
    return Response.json(
      { error: err?.message || "Failed to start live game." },
      { status: 500 },
    );
  }
}
