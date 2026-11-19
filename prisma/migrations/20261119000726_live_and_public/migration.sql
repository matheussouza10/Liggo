-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('KICKOFF', 'PERIOD_START', 'PERIOD_END', 'FULL_TIME', 'GOAL', 'OWN_GOAL', 'PENALTY_MISSED', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'TIMEOUT', 'INJURY', 'NOTE');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "publicVisible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "liveAway" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "liveHome" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "match_events" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "type" "MatchEventType" NOT NULL,
    "side" "MatchSlot",
    "minute" INTEGER,
    "athleteId" TEXT,
    "otherAthleteId" TEXT,
    "value" INTEGER NOT NULL DEFAULT 1,
    "text" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_events_matchId_createdAt_idx" ON "match_events"("matchId", "createdAt");

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_otherAthleteId_fkey" FOREIGN KEY ("otherAthleteId") REFERENCES "athletes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

