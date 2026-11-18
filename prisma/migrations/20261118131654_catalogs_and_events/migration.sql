-- CreateEnum
CREATE TYPE "ParticipationType" AS ENUM ('INDIVIDUAL', 'PAIR', 'TEAM');

-- CreateTable
CREATE TABLE "sport_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sport_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_type_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_type_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_types" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "format_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "format_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_formats" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "participationTypes" "ParticipationType"[],
    "allowsGroups" BOOLEAN NOT NULL DEFAULT false,
    "allowsRepechage" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_formats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "eventTypeId" TEXT NOT NULL,
    "formatId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "participationType" "ParticipationType" NOT NULL,
    "locationName" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sport_categories_slug_key" ON "sport_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sport_categories_name_key" ON "sport_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sports_slug_key" ON "sports"("slug");

-- CreateIndex
CREATE INDEX "sports_categoryId_idx" ON "sports"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "sports_categoryId_name_key" ON "sports"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "event_type_categories_slug_key" ON "event_type_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "event_type_categories_name_key" ON "event_type_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "event_types_slug_key" ON "event_types"("slug");

-- CreateIndex
CREATE INDEX "event_types_categoryId_idx" ON "event_types"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "event_types_categoryId_name_key" ON "event_types"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "format_categories_slug_key" ON "format_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "format_categories_name_key" ON "format_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "competition_formats_slug_key" ON "competition_formats"("slug");

-- CreateIndex
CREATE INDEX "competition_formats_categoryId_idx" ON "competition_formats"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "competition_formats_categoryId_name_key" ON "competition_formats"("categoryId", "name");

-- CreateIndex
CREATE INDEX "events_organizationId_startDate_idx" ON "events"("organizationId", "startDate");

-- CreateIndex
CREATE INDEX "events_eventTypeId_idx" ON "events"("eventTypeId");

-- CreateIndex
CREATE INDEX "events_formatId_idx" ON "events"("formatId");

-- CreateIndex
CREATE INDEX "events_sportId_idx" ON "events"("sportId");

-- AddForeignKey
ALTER TABLE "sports" ADD CONSTRAINT "sports_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "sport_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_types" ADD CONSTRAINT "event_types_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "event_type_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_formats" ADD CONSTRAINT "competition_formats_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "format_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "competition_formats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

