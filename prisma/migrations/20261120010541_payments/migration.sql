-- CreateEnum
CREATE TYPE "PaymentEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'PENDING', 'ACTIVE', 'OVERDUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('REGISTRATION', 'PLAN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentAccountStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "event_categories" ADD COLUMN     "feeCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "asaasCustomerId" TEXT,
ADD COLUMN     "asaasSubscriptionId" TEXT,
ADD COLUMN     "planId" TEXT,
ADD COLUMN     "planRenewsAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "payment_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "environment" "PaymentEnvironment" NOT NULL DEFAULT 'SANDBOX',
    "apiKeyEnc" TEXT,
    "webhookToken" TEXT,
    "baseUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "maxEvents" INTEGER,
    "maxAthletes" INTEGER,
    "maxRegistrationsPerEvent" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_payment_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "asaasAccountId" TEXT NOT NULL,
    "walletId" TEXT,
    "apiKeyEnc" TEXT NOT NULL,
    "status" "PaymentAccountStatus" NOT NULL DEFAULT 'PENDING',
    "holderName" TEXT NOT NULL,
    "holderDocument" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_payment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "PaymentKind" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "asaasPaymentId" TEXT NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "billingType" TEXT NOT NULL DEFAULT 'UNDEFINED',
    "dueDate" DATE NOT NULL,
    "paidAt" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "description" TEXT NOT NULL,
    "registrationId" TEXT,
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "organization_payment_accounts_organizationId_key" ON "organization_payment_accounts"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_asaasPaymentId_key" ON "payments"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "payments_organizationId_kind_idx" ON "payments"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "payments_registrationId_idx" ON "payments"("registrationId");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_payment_accounts" ADD CONSTRAINT "organization_payment_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

