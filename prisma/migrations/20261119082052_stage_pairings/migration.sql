-- AlterTable
ALTER TABLE "stage_entries" ADD COLUMN     "originGroup" INTEGER,
ADD COLUMN     "originMatch" INTEGER,
ADD COLUMN     "originRank" INTEGER;

-- AlterTable
ALTER TABLE "stage_runs" ADD COLUMN     "manualPairing" BOOLEAN NOT NULL DEFAULT false;

