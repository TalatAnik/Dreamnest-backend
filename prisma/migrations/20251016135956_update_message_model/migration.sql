/*
  Warnings:

  - Added the required column `receiverId` to the `messages` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('DIRECT', 'PROPERTY_INQUIRY', 'SERVICE_INQUIRY', 'BOOKING_UPDATE', 'SYSTEM');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "messageType" "MessageType" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "propertyId" TEXT,
ADD COLUMN     "receiverId" TEXT NOT NULL,
ADD COLUMN     "serviceId" TEXT;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
