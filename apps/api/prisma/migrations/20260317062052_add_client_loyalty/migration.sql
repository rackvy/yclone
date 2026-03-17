-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "discountAppliesTo" TEXT NOT NULL DEFAULT 'all',
ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ClientCertificate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientCertificate_companyId_idx" ON "ClientCertificate"("companyId");

-- CreateIndex
CREATE INDEX "ClientCertificate_clientId_idx" ON "ClientCertificate"("clientId");

-- CreateIndex
CREATE INDEX "ClientCertificate_isActive_idx" ON "ClientCertificate"("isActive");

-- AddForeignKey
ALTER TABLE "ClientCertificate" ADD CONSTRAINT "ClientCertificate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientCertificate" ADD CONSTRAINT "ClientCertificate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
