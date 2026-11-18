-- CreateEnum
CREATE TYPE "ScoringModel" AS ENUM ('SETS', 'POINTS', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "MatchFormat" AS ENUM ('SINGLE', 'BEST_OF', 'HOME_AWAY');

-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('ROUND_ROBIN', 'GROUPS', 'SINGLE_ELIM', 'DOUBLE_ELIM', 'SWISS', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "SeedingMode" AS ENUM ('MANUAL', 'RANDOM', 'RANKING', 'SNAKE');

-- CreateEnum
CREATE TYPE "GrandFinalMode" AS ENUM ('NONE', 'SINGLE', 'RESET');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "rulesLockedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "event_rules" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "presetKey" TEXT,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "scoringModel" "ScoringModel" NOT NULL,
    "winPoints" INTEGER NOT NULL DEFAULT 3,
    "drawPoints" INTEGER NOT NULL DEFAULT 1,
    "lossPoints" INTEGER NOT NULL DEFAULT 0,
    "allowDraw" BOOLEAN NOT NULL DEFAULT true,
    "pointsTable" JSONB,
    "tiebreakers" JSONB NOT NULL,
    "woScoreFor" INTEGER NOT NULL DEFAULT 3,
    "woScoreAgainst" INTEGER NOT NULL DEFAULT 0,
    "woPointsAwarded" INTEGER NOT NULL DEFAULT 3,
    "woPointsPenalty" INTEGER NOT NULL DEFAULT 0,
    "woEliminationLimit" INTEGER,
    "woNullifyResults" BOOLEAN NOT NULL DEFAULT false,
    "matchFormat" "MatchFormat" NOT NULL DEFAULT 'SINGLE',
    "bestOf" INTEGER,
    "extraTime" BOOLEAN NOT NULL DEFAULT false,
    "penalties" BOOLEAN NOT NULL DEFAULT false,
    "awayGoals" BOOLEAN NOT NULL DEFAULT false,
    "sportConfig" JSONB,
    "placePoints" JSONB,
    "dropWorst" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_stages" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StageType" NOT NULL,
    "groupCount" INTEGER,
    "groupSize" INTEGER,
    "advancingPerGroup" INTEGER,
    "roundRobinLegs" INTEGER NOT NULL DEFAULT 1,
    "swissRounds" INTEGER,
    "thirdPlaceMatch" BOOLEAN NOT NULL DEFAULT false,
    "grandFinalMode" "GrandFinalMode" NOT NULL DEFAULT 'NONE',
    "seeding" "SeedingMode" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_stages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_rules_eventId_key" ON "event_rules"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_stages_eventId_order_key" ON "event_stages"("eventId", "order");

-- AddForeignKey
ALTER TABLE "event_rules" ADD CONSTRAINT "event_rules_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_stages" ADD CONSTRAINT "event_stages_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

