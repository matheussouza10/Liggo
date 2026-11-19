-- CreateTable
CREATE TABLE "match_sets" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "homePoints" INTEGER NOT NULL,
    "awayPoints" INTEGER NOT NULL,

    CONSTRAINT "match_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "match_sets_matchId_number_key" ON "match_sets"("matchId", "number");

-- AddForeignKey
ALTER TABLE "match_sets" ADD CONSTRAINT "match_sets_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

