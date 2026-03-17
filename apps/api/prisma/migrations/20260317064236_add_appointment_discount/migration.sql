-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "discountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountTotal" INTEGER NOT NULL DEFAULT 0;
