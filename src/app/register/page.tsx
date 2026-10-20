import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { TeamOnboarding } from "@/components/games/TeamOnboarding";
export const dynamic = "force-dynamic";
export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string; redirect?: string }>;
}) {
  const query = await searchParams;
  const user = await getSession();
  if (!user) {
    const params = new URLSearchParams();
    if (query.eventId) params.set("eventId", query.eventId);
    if (query.redirect) params.set("redirect", query.redirect);
    const target = `/register${params.size ? `?${params}` : ""}`;
    redirect(`/api/auth/login?redirect=${encodeURIComponent(target)}`);
  }
  const candidate = query.redirect || "/games";
  const destination = /^\/games(?:\/[^\\\s?#]+)*(?:\?[^\\\s]*)?$/.test(
    candidate,
  )
    ? candidate
    : "/games";
  const target = query.eventId || destination.match(/^\/games\/([^/?]+)/)?.[1];
  const games = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ endTime: null }, { endTime: { gt: new Date() } }],
      rosterTeams: { some: {} },
    },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      rosterTeams: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, _count: { select: { members: true } } },
      },
      rosterMembers: { where: { userId: user.id }, select: { id: true } },
    },
  });
  const selected = games.find((g) => g.id === target || g.slug === target);
  if (selected?.rosterMembers.length && !query.eventId) redirect(destination);
  return (
    <div className="min-h-screen bg-[#07080b] text-white">
      <Navbar user={user} />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <p className="text-sm text-cyan-400">Competition access</p>
        <h1 className="mt-2 text-3xl font-semibold">Join your team</h1>
        <p className="mb-8 mt-3 text-zinc-400">
          Choose your registered team, then match your roster email. You’ll keep
          your own profile, progress, and score.
        </p>
        <TeamOnboarding
          competitions={games.map((g) => ({
            id: g.id,
            name: g.name,
            joined: g.rosterMembers.length > 0,
            teams: g.rosterTeams.map((t) => ({
              id: t.id,
              name: t.name,
              memberCount: t._count.members,
            })),
          }))}
          initialEventId={selected?.id}
        />
      </main>
    </div>
  );
}
