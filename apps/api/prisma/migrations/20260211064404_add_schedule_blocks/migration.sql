-- CreateTable
CREATE TABLE "WorkScheduleBlock" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkScheduleBlock_companyId_idx" ON "WorkScheduleBlock"("companyId");

-- CreateIndex
CREATE INDEX "WorkScheduleBlock_employeeId_idx" ON "WorkScheduleBlock"("employeeId");

-- CreateIndex
CREATE INDEX "WorkScheduleBlock_employeeId_date_idx" ON "WorkScheduleBlock"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "WorkScheduleBlock" ADD CONSTRAINT "WorkScheduleBlock_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkScheduleBlock" ADD CONSTRAINT "WorkScheduleBlock_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
