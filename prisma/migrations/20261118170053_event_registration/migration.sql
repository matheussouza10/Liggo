-- CreateEnum
CREATE TYPE "CategoryGender" AS ENUM ('MALE', 'FEMALE', 'MIXED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('COACH', 'ASSISTANT', 'MANAGER', 'PHYSIO', 'OTHER');

-- CreateTable
CREATE TABLE "sport_positions" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sport_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_categories" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "CategoryGender" NOT NULL DEFAULT 'MIXED',
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "rosterMin" INTEGER NOT NULL DEFAULT 1,
    "rosterMax" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "teamId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_members" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "shirtNumber" INTEGER,
    "positionId" TEXT,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_staff" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sport_positions_sportId_name_key" ON "sport_positions"("sportId", "name");

-- CreateIndex
CREATE INDEX "event_categories_eventId_idx" ON "event_categories"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "event_categories_eventId_name_key" ON "event_categories"("eventId", "name");

-- CreateIndex
CREATE INDEX "registrations_eventId_idx" ON "registrations"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_categoryId_teamId_key" ON "registrations"("categoryId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_members_registrationId_athleteId_key" ON "registration_members"("registrationId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_members_categoryId_athleteId_key" ON "registration_members"("categoryId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_members_registrationId_shirtNumber_key" ON "registration_members"("registrationId", "shirtNumber");

-- CreateIndex
CREATE INDEX "registration_staff_registrationId_idx" ON "registration_staff"("registrationId");

-- AddForeignKey
ALTER TABLE "sport_positions" ADD CONSTRAINT "sport_positions_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_categories" ADD CONSTRAINT "event_categories_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "event_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_members" ADD CONSTRAINT "registration_members_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_members" ADD CONSTRAINT "registration_members_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_members" ADD CONSTRAINT "registration_members_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "event_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_members" ADD CONSTRAINT "registration_members_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "sport_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_staff" ADD CONSTRAINT "registration_staff_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

