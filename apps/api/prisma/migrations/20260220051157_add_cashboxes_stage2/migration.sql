-- CreateEnum
CREATE TYPE "CashboxType" AS ENUM ('cash', 'bank', 'other');

-- AlterTable
ALTER TABLE "AppointmentPayment" ADD COLUMN     "cashboxId" TEXT;

-- CreateTable
CREATE TABLE "Cashbox" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "type" "CashboxType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cashbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cashbox_companyId_idx" ON "Cashbox"("companyId");

-- CreateIndex
CREATE INDEX "Cashbox_branchId_idx" ON "Cashbox"("branchId");

-- CreateIndex
CREATE INDEX "Cashbox_isActive_idx" ON "Cashbox"("isActive");

-- CreateIndex
CREATE INDEX "AppointmentPayment_cashboxId_idx" ON "AppointmentPayment"("cashboxId");

-- AddForeignKey
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_cashboxId_fkey" FOREIGN KEY ("cashboxId") REFERENCES "Cashbox"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashbox" ADD CONSTRAINT "Cashbox_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashbox" ADD CONSTRAINT "Cashbox_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
