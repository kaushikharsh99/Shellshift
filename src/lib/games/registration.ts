import { getRosterMembership } from "./rosterService";
import { prisma } from "@/lib/prisma";

export interface RegistrationWindow {
  status: string;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  startTime?: Date | null;
  endTime?: Date | null;
}

export function canRegisterForGame(game: RegistrationWindow, now = new Date()) {
  if (game.status !== "PUBLISHED") return false;

  // Allow registration during an active live competition
  if (
    game.startTime &&
    game.endTime &&
    now >= game.startTime &&
    now < game.endTime
  ) {
    return true;
  }

  // Allow registration during the pre-event registration window
  return (
    !!game.registrationOpensAt &&
    !!game.registrationClosesAt &&
    now >= game.registrationOpensAt &&
    now < game.registrationClosesAt
  );
}

export async function registerUserForGame(
  eventId: string,
  userId: string,
  now = new Date(),
) {
  const game = await prisma.event.findUnique({ where: { id: eventId } });
  if (!game) return { error: "Game not found.", status: 404 };
  if (!canRegisterForGame(game, now))
    return { error: "Registration is not open.", status: 403 };
  if (!(await getRosterMembership(eventId, userId)))
    return {
      error: "Select your team and match your roster email before registering.",
      status: 403,
    };
  const registration = await prisma.gameRegistration.upsert({
    where: { eventId_userId: { eventId, userId } },
    update: { status: "REGISTERED" },
    create: { eventId, userId },
  });
  return { registration, status: 200 };
}
