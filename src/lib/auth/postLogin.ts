import { prisma } from "@/lib/prisma";

export function postLoginDestination(
  role: string,
  target: string,
  joined: boolean,
) {
  const safe =
    target.startsWith("/") &&
    !target.startsWith("//") &&
    !/[\\\u0000-\u0020]/.test(target)
      ? target
      : "/games";
  if (safe === "/register" || safe.startsWith("/register?")) return safe;
  return role === "ADMIN" || joined
    ? safe
    : `/register?redirect=${encodeURIComponent(safe)}`;
}

export async function resolveRosterLoginDestination(
  role: string,
  userId: string,
  target: string,
) {
  if (role === "ADMIN") return postLoginDestination(role, target, false);
  const gameKey = target.match(/^\/games\/([^/?]+)/)?.[1];
  const membership = await prisma.rosterMember.findFirst({
    where: {
      userId,
      ...(gameKey
        ? { event: { OR: [{ id: gameKey }, { slug: gameKey }] } }
        : {}),
    },
    select: { id: true },
  });
  return postLoginDestination(role, target, !!membership);
}
