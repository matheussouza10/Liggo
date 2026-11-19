-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('OK', 'NM', 'DNF', 'DNS', 'DQ');

-- CreateTable
CREATE TABLE "performance_attempts" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'OK',
    "value" DOUBLE PRECISION,

    CONSTRAINT "performance_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "performance_attempts_entryId_number_key" ON "performance_attempts"("entryId", "number");

-- AddForeignKey
ALTER TABLE "performance_attempts" ADD CONSTRAINT "performance_attempts_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "stage_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

