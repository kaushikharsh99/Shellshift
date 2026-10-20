-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "rosterTeamId" TEXT;

-- CreateTable
CREATE TABLE "CompetitionTeam" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CompetitionTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterMember" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "userId" TEXT,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "RosterMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitionTeam_eventId_idx" ON "CompetitionTeam"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionTeam_eventId_name_key" ON "CompetitionTeam"("eventId", "name");

-- CreateIndex
CREATE INDEX "RosterMember_userId_idx" ON "RosterMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterMember_eventId_email_key" ON "RosterMember"("eventId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "RosterMember_eventId_userId_key" ON "RosterMember"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterMember_teamId_position_key" ON "RosterMember"("teamId", "position");

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_rosterTeamId_fkey" FOREIGN KEY ("rosterTeamId") REFERENCES "CompetitionTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionTeam" ADD CONSTRAINT "CompetitionTeam_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterMember" ADD CONSTRAINT "RosterMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterMember" ADD CONSTRAINT "RosterMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "CompetitionTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterMember" ADD CONSTRAINT "RosterMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

