
-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "registrationDeadline" TIMESTAMP(3),
ADD COLUMN     "registrationNotes" TEXT,
ADD COLUMN     "registrationOpen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "registration_requests" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "teamName" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "notes" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "registrationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_request_members" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "cpf" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "guardianName" TEXT,
    "guardianCpf" TEXT,
    "shirtNumber" INTEGER,
    "positionId" TEXT,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "registration_request_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_request_staff" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "contact" TEXT,

    CONSTRAINT "registration_request_staff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "registration_requests_tokenHash_key" ON "registration_requests"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "registration_requests_registrationId_key" ON "registration_requests"("registrationId");

-- CreateIndex
CREATE INDEX "registration_requests_eventId_status_idx" ON "registration_requests"("eventId", "status");

-- CreateIndex
CREATE INDEX "registration_requests_contactEmail_idx" ON "registration_requests"("contactEmail");

-- CreateIndex
CREATE INDEX "registration_request_members_requestId_idx" ON "registration_request_members"("requestId");

-- CreateIndex
CREATE INDEX "registration_request_staff_requestId_idx" ON "registration_request_staff"("requestId");

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "event_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_request_members" ADD CONSTRAINT "registration_request_members_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "registration_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_request_members" ADD CONSTRAINT "registration_request_members_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "sport_positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_request_staff" ADD CONSTRAINT "registration_request_staff_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "registration_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

