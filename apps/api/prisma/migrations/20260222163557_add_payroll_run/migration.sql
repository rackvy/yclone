-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('draft', 'approved');

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "branchId" TEXT,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRunLine" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workDaysCount" INTEGER NOT NULL,
    "servicesKopeks" INTEGER NOT NULL,
    "productsKopeks" INTEGER NOT NULL,
    "bonusKopeks" INTEGER NOT NULL,
    "minimumTopUpKopeks" INTEGER NOT NULL,
    "totalKopeks" INTEGER NOT NULL,

    CONSTRAINT "PayrollRunLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRunDetail" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "PayrollRunDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollRun_companyId_idx" ON "PayrollRun"("companyId");

-- CreateIndex
CREATE INDEX "PayrollRun_branchId_idx" ON "PayrollRun"("branchId");

-- CreateIndex
CREATE INDEX "PayrollRun_fromDate_idx" ON "PayrollRun"("fromDate");

-- CreateIndex
CREATE INDEX "PayrollRun_toDate_idx" ON "PayrollRun"("toDate");

-- CreateIndex
CREATE INDEX "PayrollRun_status_idx" ON "PayrollRun"("status");

-- CreateIndex
CREATE INDEX "PayrollRunLine_runId_idx" ON "PayrollRunLine"("runId");

-- CreateIndex
CREATE INDEX "PayrollRunLine_employeeId_idx" ON "PayrollRunLine"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollRunDetail_runId_idx" ON "PayrollRunDetail"("runId");

-- CreateIndex
CREATE INDEX "PayrollRunDetail_employeeId_idx" ON "PayrollRunDetail"("employeeId");

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunLine" ADD CONSTRAINT "PayrollRunLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunLine" ADD CONSTRAINT "PayrollRunLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunDetail" ADD CONSTRAINT "PayrollRunDetail_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRunDetail" ADD CONSTRAINT "PayrollRunDetail_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
