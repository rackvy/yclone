/*
  Warnings:

  - Added the required column `companyId` to the `WorkScheduleException` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyId` to the `WorkScheduleRule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WorkScheduleException" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WorkScheduleRule" ADD COLUMN     "companyId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "WorkScheduleException_companyId_idx" ON "WorkScheduleException"("companyId");

-- CreateIndex
CREATE INDEX "WorkScheduleRule_companyId_idx" ON "WorkScheduleRule"("companyId");

-- AddForeignKey
ALTER TABLE "WorkScheduleRule" ADD CONSTRAINT "WorkScheduleRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkScheduleException" ADD CONSTRAINT "WorkScheduleException_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
