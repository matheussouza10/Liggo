-- AlterEnum
ALTER TYPE "MatchEventType" ADD VALUE 'FOUL';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "possessionHome" INTEGER;

