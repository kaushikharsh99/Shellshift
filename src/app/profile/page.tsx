import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { rankIndividualRuns } from "@/lib/games/standings";
export const dynamic = "force-dynamic";
export default async function Profile() {
  const user = await getSession();
  if (!user) redirect("/api/auth/login?redirect=/profile");
  const [entries, registrations] = await Promise.all([
    prisma.rosterMember.findMany({
      where: { userId: user.id },
      select: {
        eventId: true,
        team: { select: { name: true } },
        event: { select: { name: true } },
      },
    }),
    prisma.gameRegistration.findMany({
      where: { userId: user.id },
      orderBy: { registeredAt: "desc" },
      include: {
        event: {
          select: {
            name: true,
            runs: {
              where: {
                userId: user.id,
                status: "COMPLETED",
                isRanked: true,
                legacyIndividualEligible: false,
              },
              select: {
                challengeId: true,
                finalScore: true,
                durationMs: true,
                completedAt: true,
              },
            },
          },
        },
      },
    }),
  ]);
  return (
    <div className="min-h-screen bg-[#07080b] text-white">
      <Navbar user={user} />
      <main className="mx-auto max-w-5xl px-5 py-12">
        <p className="text-sm text-cyan-400">Personal profile</p>
        <h1 className="mt-2 text-4xl font-semibold">{user.name}</h1>
        <p className="mt-3 text-zinc-400">
          Your own competition progress and scores.
        </p>
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Your teams</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {entries.map((e) => (
              <Link
                key={e.eventId}
                href={`/games/${e.eventId}/team`}
                className="rounded-xl border border-cyan-900 bg-cyan-950/20 p-5"
              >
                <strong>{e.team.name}</strong>
                <p className="mt-2 text-sm text-zinc-400">{e.event.name}</p>
                <span className="mt-4 block text-sm text-cyan-300">
                  View team profile →
                </span>
              </Link>
            ))}
          </div>
          {!entries.length && (
            <Link href="/register" className="mt-4 inline-block text-cyan-300">
              Select your team →
            </Link>
          )}
        </section>
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Your competitions</h2>
          <div className="mt-4 grid gap-3">
            {registrations.map((r) => {
              const score = rankIndividualRuns(
                r.event.runs.map((run) => ({
                  ...run,
                  userId: user.id,
                  userName: user.name,
                })),
              )[0];
              return (
                <Link
                  key={r.id}
                  href={`/games/${r.eventId}`}
                  className="rounded-xl border border-zinc-800 bg-[#0e1016] p-5"
                >
                  <strong>{r.event.name}</strong>
                  <p className="mt-3 text-sm text-zinc-400">
                    {score?.challengesCompleted || 0} completed challenges ·{" "}
                    {(score?.totalScore || 0).toLocaleString()} points
                  </p>
                </Link>
              );
            })}
            {!registrations.length && (
              <p className="text-zinc-400">
                No registrations yet. Choose your team, then register for a
                competition.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
