-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SYSTEM_ADMIN', 'OWNER', 'MEMBER');

-- AlterTable
-- The users table may already hold rows (the dev seed), so the new required
-- column gets a temporary default, which is dropped right after. An empty
-- hash never verifies, so those rows cannot log in until a password is set.
ALTER TABLE "users" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "passwordHash" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP DEFAULT;

-- name becomes required: backfill any missing value first.
UPDATE "users" SET "name" = split_part("email", '@', 1) WHERE "name" IS NULL;
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

