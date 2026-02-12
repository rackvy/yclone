-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('active', 'terminated');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "status" "EmployeeStatus" NOT NULL DEFAULT 'active';
