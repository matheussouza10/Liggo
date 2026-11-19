-- CreateEnum
CREATE TYPE "StageRunStatus" AS ENUM ('DRAWN', 'LIVE', 'DONE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'FINISHED', 'WALKOVER');

-- CreateEnum
CREATE TYPE "MatchSlot" AS ENUM ('HOME', 'AWAY');

-- CreateTable
CREATE TABLE "stage_runs" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" "StageRunStatus" NOT NULL DEFAULT 'DRAWN',
    "drawSeed" INTEGER NOT NULL,
    "drawMode" "SeedingMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_groups" (
    "id" TEXT NOT NULL,
    "stageRunId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "stage_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_entries" (
    "id" TEXT NOT NULL,
    "stageRunId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "groupId" TEXT,
    "seed" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stage_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "stageRunId" TEXT NOT NULL,
    "groupId" TEXT,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT,
    "homeEntryId" TEXT,
    "awayEntryId" TEXT,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "homePenalties" INTEGER,
    "awayPenalties" INTEGER,
    "winnerEntryId" TEXT,
    "nextMatchId" TEXT,
    "nextSlot" "MatchSlot",
    "loserMatchId" TEXT,
    "loserSlot" "MatchSlot",
    "scheduledAt" TIMESTAMP(3),
    "venue" TEXT,
    "refereeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stage_runs_stageId_categoryId_key" ON "stage_runs"("stageId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "stage_groups_stageRunId_order_key" ON "stage_groups"("stageRunId", "order");

-- CreateIndex
CREATE INDEX "stage_entries_registrationId_idx" ON "stage_entries"("registrationId");

-- CreateIndex
CREATE UNIQUE INDEX "stage_entries_stageRunId_registrationId_key" ON "stage_entries"("stageRunId", "registrationId");

-- CreateIndex
CREATE INDEX "matches_stageRunId_round_position_idx" ON "matches"("stageRunId", "round", "position");

-- CreateIndex
CREATE INDEX "matches_refereeId_scheduledAt_idx" ON "matches"("refereeId", "scheduledAt");

-- CreateIndex
CREATE INDEX "matches_scheduledAt_idx" ON "matches"("scheduledAt");

-- AddForeignKey
ALTER TABLE "stage_runs" ADD CONSTRAINT "stage_runs_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "event_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_runs" ADD CONSTRAINT "stage_runs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "event_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_groups" ADD CONSTRAINT "stage_groups_stageRunId_fkey" FOREIGN KEY ("stageRunId") REFERENCES "stage_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_entries" ADD CONSTRAINT "stage_entries_stageRunId_fkey" FOREIGN KEY ("stageRunId") REFERENCES "stage_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_entries" ADD CONSTRAINT "stage_entries_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_entries" ADD CONSTRAINT "stage_entries_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "stage_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_stageRunId_fkey" FOREIGN KEY ("stageRunId") REFERENCES "stage_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "stage_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_homeEntryId_fkey" FOREIGN KEY ("homeEntryId") REFERENCES "stage_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_awayEntryId_fkey" FOREIGN KEY ("awayEntryId") REFERENCES "stage_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winnerEntryId_fkey" FOREIGN KEY ("winnerEntryId") REFERENCES "stage_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "referees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

