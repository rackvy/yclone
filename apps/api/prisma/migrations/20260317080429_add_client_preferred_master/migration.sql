-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "preferredMasterId" TEXT;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_preferredMasterId_fkey" FOREIGN KEY ("preferredMasterId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
