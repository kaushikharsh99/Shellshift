import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Users, ShieldCheck, Trophy } from "lucide-react";
import { LobbyCatalog, LobbyChallengeItem } from "./LobbyCatalog";
import { isMockAuthAllowed } from "@/lib/auth/oidc";
import { SEED_CHALLENGES } from "@/lib/challenges/seedData";

export const dynamic = "force-dynamic";

export default async function LobbyPage() {
  const session = await getSession();

  if (!session) {
    redirect(isMockAuthAllowed() ? "/api/auth/login?mock=true&role=user" : "/api/auth/login");
  }

  if (!session.teamId) {
    redirect("/register");
  }

  const team = await prisma.team.findUnique({
    where: { id: session.teamId },
    include: {
      memberships: { include: { user: true } },
      runs: {
        include: { challenge: true },
      },
    },
  });

  const now = new Date();
  const event = await prisma.event.findFirst({
    where: {
      status: "PUBLISHED",
      startTime: { lte: now },
      endTime: { gt: now },
      registrations: { some: { userId: session.id, status: "REGISTERED" } },
    },
    orderBy: { createdAt: "desc" },
    include: { challenges: { orderBy: { order: "asc" }, include: { challenge: true } } },
  });
  if (!event) redirect("/games");

  const memberIds = team?.memberships.map((member) => member.userId).sort() || [];
  const memberIndex = memberIds.indexOf(session.id);
  const assignedLineup = memberIds.length > 1 && memberIndex >= 0
    ? event.challenges.filter((_, index) => index % memberIds.length === memberIndex)
    : event.challenges;
  const challenges = assignedLineup.filter((entry) => entry.challenge.isPublished);

  const durationLookup = new Map(SEED_CHALLENGES.map((sc) => [sc.slug, sc.estimatedDuration]));

  const catalogItems: LobbyChallengeItem[] = challenges.map((entry) => {
    const challenge = entry.challenge;
    const run = team?.runs.find((r) => r.eventId === event.id && r.challengeId === challenge.id);

    let clueCount = 0;
    try {
      clueCount = JSON.parse(challenge.clues || "[]").length;
    } catch {}

    let objDesc = "";
    try {
      objDesc = JSON.parse(challenge.objectiveConfig || "{}").description || "";
    } catch {}

    let scoringConfig = {
      maxBaseScore: 1000,
      difficultyMultiplier:
        challenge.difficulty === "HARD" ? 1.5 : challenge.difficulty === "MEDIUM" ? 1.25 : 1.0,
    };
    try {
      if (challenge.scoringConfig) {
        const sc = JSON.parse(challenge.scoringConfig);
        scoringConfig = {
          maxBaseScore: sc.maxBaseScore || 1000,
          difficultyMultiplier: sc.difficultyMultiplier || scoringConfig.difficultyMultiplier,
        };
      }
    } catch {}

    return {
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      description: challenge.description,
      difficulty: challenge.difficulty as "EASY" | "MEDIUM" | "HARD",
      order: entry.order,
      timeLimitSeconds: challenge.timeLimitSeconds,
      estimatedDuration: durationLookup.get(challenge.slug) || `${Math.floor(challenge.timeLimitSeconds / 60)} min`,
      scoringConfig,
      clueCount,
      objectiveDescription: objDesc,
      runStatus: (run?.status as any) || null,
      runId: run?.id || null,
      runDurationMs: run?.durationMs || null,
      finalScore: run?.finalScore || null,
    };
  });

  const completedRuns = team?.runs.filter((r) => r.eventId === event.id && r.status === "COMPLETED") || [];
  const completedCount = completedRuns.length;
  const totalScore = completedRuns.reduce((acc, r) => acc + (r.finalScore || 0), 0);
  const progressPercent = challenges.length > 0 ? Math.round((completedCount / challenges.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col selection:bg-cyan-500 selection:text-black">
      <Navbar user={session} />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full flex-1 space-y-6">
        {/* Lobby Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#27272a]">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Mission Catalog
            </h1>
            <p className="text-xs text-[#a1a1aa] mt-0.5">
              Twenty cipher-driven Linux missions. Uncover the command transpositions and complete the objectives.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-2.5 py-1 rounded bg-[#18181b] border border-[#27272a] text-xs font-mono font-medium flex items-center gap-2 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Event: {event?.status || "ACTIVE"}
            </span>
          </div>
        </div>

        {/* Team Profile Banner */}
        <div className="shell-panel p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center justify-center text-cyan-400 font-bold shrink-0">
                <Users className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                {team?.name || session.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded bg-[#18181b] text-cyan-400 border border-[#27272a] text-xs font-mono font-bold">
                Code: {team?.inviteCode}
              </span>
            </div>
            <p className="text-xs text-[#a1a1aa]">
              Operator: <span className="text-[#fafafa] font-medium">{session.name || "Contestant"}</span> · {team?.memberships.length || 1} team member{(team?.memberships.length || 1) > 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto justify-between md:justify-end">
            <div className="px-3.5 py-2 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center gap-2.5 font-mono">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-[#a1a1aa] block uppercase font-semibold">Total Points</span>
                <span className="text-cyan-400 font-bold text-sm tabular-nums">{totalScore} PTS</span>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-lg bg-[#18181b] border border-[#27272a] flex items-center gap-3 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="flex items-center justify-between gap-3 text-[10px]">
                  <span className="text-[#a1a1aa] uppercase font-semibold">Missions</span>
                  <span className="text-emerald-400 font-bold tabular-nums">{completedCount} / {challenges.length}</span>
                </div>
                <div className="w-24 bg-[#09090b] h-1.5 rounded-full overflow-hidden mt-1 border border-[#27272a]">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 20 Challenges Catalog with Filters & Sections */}
        <LobbyCatalog challenges={catalogItems} gameId={event.id} />

        {/* Fair play banner */}
        <div className="flex items-center justify-center gap-2 py-3 border-t border-[#27272a] text-[11px] text-[#a1a1aa]">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Server-authoritative timers</span>
          <span>·</span>
          <span>Sandboxed virtual filesystem</span>
          <span>·</span>
          <span>Cryptographically audited leaderboard</span>
        </div>
      </main>
    </div>
  );
}
