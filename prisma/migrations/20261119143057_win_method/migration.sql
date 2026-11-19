-- CreateEnum
CREATE TYPE "WinMethod" AS ENUM ('POINTS', 'DECISION', 'SUBMISSION', 'KO', 'TKO', 'IPPON', 'DISQUALIFICATION', 'RETIREMENT');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "winMethod" "WinMethod";

