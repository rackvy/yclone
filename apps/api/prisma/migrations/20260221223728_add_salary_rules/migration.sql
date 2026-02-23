/*
  Warnings:

  - You are about to drop the column `amountKopeks` on the `AppointmentPayment` table. All the data in the column will be lost.
  - You are about to drop the column `amountKopeks` on the `SalePayment` table. All the data in the column will be lost.
  - Added the required column `amount` to the `AppointmentPayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `SalePayment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SalaryCalcMode" AS ENUM ('percent', 'fixed');

-- CreateEnum
CREATE TYPE "SalaryMinMode" AS ENUM ('none', 'daily', 'monthly');

-- AlterTable
ALTER TABLE "AppointmentPayment" DROP COLUMN "amountKopeks",
ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SalePayment" DROP COLUMN "amountKopeks",
ADD COLUMN     "amount" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "SalaryRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calcByPayments" BOOLEAN NOT NULL DEFAULT true,
    "includeRefunds" BOOLEAN NOT NULL DEFAULT false,
    "servicesMode" "SalaryCalcMode" NOT NULL DEFAULT 'percent',
    "servicesValue" INTEGER NOT NULL DEFAULT 0,
    "productsMode" "SalaryCalcMode" NOT NULL DEFAULT 'percent',
    "productsValue" INTEGER NOT NULL DEFAULT 0,
    "minMode" "SalaryMinMode" NOT NULL DEFAULT 'none',
    "minValue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRuleServiceOverride" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "serviceId" TEXT,
    "categoryId" TEXT,
    "mode" "SalaryCalcMode" NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "SalaryRuleServiceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRuleProductOverride" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "productId" TEXT,
    "categoryId" TEXT,
    "mode" "SalaryCalcMode" NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "SalaryRuleProductOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRuleAssignment" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryRuleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalaryRule_companyId_idx" ON "SalaryRule"("companyId");

-- CreateIndex
CREATE INDEX "SalaryRule_isActive_idx" ON "SalaryRule"("isActive");

-- CreateIndex
CREATE INDEX "SalaryRuleServiceOverride_ruleId_idx" ON "SalaryRuleServiceOverride"("ruleId");

-- CreateIndex
CREATE INDEX "SalaryRuleServiceOverride_serviceId_idx" ON "SalaryRuleServiceOverride"("serviceId");

-- CreateIndex
CREATE INDEX "SalaryRuleServiceOverride_categoryId_idx" ON "SalaryRuleServiceOverride"("categoryId");

-- CreateIndex
CREATE INDEX "SalaryRuleProductOverride_ruleId_idx" ON "SalaryRuleProductOverride"("ruleId");

-- CreateIndex
CREATE INDEX "SalaryRuleProductOverride_productId_idx" ON "SalaryRuleProductOverride"("productId");

-- CreateIndex
CREATE INDEX "SalaryRuleProductOverride_categoryId_idx" ON "SalaryRuleProductOverride"("categoryId");

-- CreateIndex
CREATE INDEX "SalaryRuleAssignment_ruleId_idx" ON "SalaryRuleAssignment"("ruleId");

-- CreateIndex
CREATE INDEX "SalaryRuleAssignment_employeeId_idx" ON "SalaryRuleAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "SalaryRuleAssignment_branchId_idx" ON "SalaryRuleAssignment"("branchId");

-- CreateIndex
CREATE INDEX "SalaryRuleAssignment_startsAt_idx" ON "SalaryRuleAssignment"("startsAt");

-- AddForeignKey
ALTER TABLE "SalaryRule" ADD CONSTRAINT "SalaryRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRuleServiceOverride" ADD CONSTRAINT "SalaryRuleServiceOverride_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SalaryRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRuleServiceOverride" ADD CONSTRAINT "SalaryRuleServiceOverride_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRuleServiceOverride" ADD CONSTRAINT "SalaryRuleServiceOverride_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRuleProductOverride" ADD CONSTRAINT "SalaryRuleProductOverride_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SalaryRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRuleProductOverride" ADD CONSTRAINT "SalaryRuleProductOverride_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRuleProductOverride" ADD CONSTRAINT "SalaryRuleProductOverride_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRuleAssignment" ADD CONSTRAINT "SalaryRuleAssignment_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SalaryRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRuleAssignment" ADD CONSTRAINT "SalaryRuleAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRuleAssignment" ADD CONSTRAINT "SalaryRuleAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
