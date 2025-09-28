/*
  Warnings:

  - You are about to drop the column `bookingId` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `bookingId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `availableTo` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `cleaningFee` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `maxGuests` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerNight` on the `properties` table. All the data in the column will be lost.
  - You are about to drop the `bookings` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('VACANT', 'OCCUPIED', 'UNDER_APPLICATION', 'MAINTENANCE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_renterId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_bookingId_fkey";

-- DropIndex
DROP INDEX "payments_bookingId_key";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "bookingId",
ADD COLUMN     "leaseApplicationId" TEXT;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "bookingId";

-- AlterTable
ALTER TABLE "properties" DROP COLUMN "availableTo",
DROP COLUMN "cleaningFee",
DROP COLUMN "maxGuests",
DROP COLUMN "pricePerNight",
ADD COLUMN     "currentTenantId" TEXT,
ADD COLUMN     "leaseEndDate" TIMESTAMP(3),
ADD COLUMN     "leaseStartDate" TIMESTAMP(3),
ADD COLUMN     "leaseStatus" "LeaseStatus" NOT NULL DEFAULT 'VACANT',
ADD COLUMN     "maxOccupants" INTEGER,
ADD COLUMN     "monthlyRent" DOUBLE PRECISION,
ADD COLUMN     "nextRentDue" TIMESTAMP(3),
ALTER COLUMN "country" SET DEFAULT 'Bangladesh',
ALTER COLUMN "availableFrom" DROP NOT NULL;

-- DropTable
DROP TABLE "bookings";

-- CreateTable
CREATE TABLE "lease_applications" (
    "id" TEXT NOT NULL,
    "preferredMoveInDate" TIMESTAMP(3) NOT NULL,
    "leaseDuration" INTEGER NOT NULL,
    "monthlyIncome" DOUBLE PRECISION NOT NULL,
    "employmentStatus" TEXT NOT NULL,
    "previousAddress" TEXT,
    "emergencyContact" TEXT NOT NULL,
    "emergencyPhone" TEXT NOT NULL,
    "specialRequests" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "applicantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "lease_applications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_currentTenantId_fkey" FOREIGN KEY ("currentTenantId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_applications" ADD CONSTRAINT "lease_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lease_applications" ADD CONSTRAINT "lease_applications_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_leaseApplicationId_fkey" FOREIGN KEY ("leaseApplicationId") REFERENCES "lease_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
