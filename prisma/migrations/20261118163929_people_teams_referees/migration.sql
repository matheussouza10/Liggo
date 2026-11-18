-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "RefereeRole" AS ENUM ('REFEREE', 'JUDGE', 'ASSISTANT', 'TABLE_OFFICIAL');

-- CreateTable
CREATE TABLE "athletes" (
    "id" TEXT NOT NULL,
    "cpf" TEXT,
    "name" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "guardianName" TEXT,
    "guardianCpf" TEXT,
    "createdByOrganizationId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_athletes" (
    "organizationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_athletes_pkey" PRIMARY KEY ("organizationId","athleteId")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "city" TEXT,
    "state" TEXT,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referees" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "RefereeRole" NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "licenseEntity" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referee_sports" (
    "refereeId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,

    CONSTRAINT "referee_sports_pkey" PRIMARY KEY ("refereeId","sportId")
);

-- CreateIndex
CREATE UNIQUE INDEX "athletes_cpf_key" ON "athletes"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "athletes_userId_key" ON "athletes"("userId");

-- CreateIndex
CREATE INDEX "athletes_createdByOrganizationId_idx" ON "athletes"("createdByOrganizationId");

-- CreateIndex
CREATE INDEX "organization_athletes_athleteId_idx" ON "organization_athletes"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_organizationId_name_key" ON "teams"("organizationId", "name");

-- CreateIndex
CREATE INDEX "referees_organizationId_idx" ON "referees"("organizationId");

-- CreateIndex
CREATE INDEX "referee_sports_sportId_idx" ON "referee_sports"("sportId");

-- AddForeignKey
ALTER TABLE "organization_athletes" ADD CONSTRAINT "organization_athletes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_athletes" ADD CONSTRAINT "organization_athletes_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referees" ADD CONSTRAINT "referees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referee_sports" ADD CONSTRAINT "referee_sports_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "referees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referee_sports" ADD CONSTRAINT "referee_sports_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

