-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('CA', 'ES', 'EN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "locale" "Locale" NOT NULL DEFAULT 'ES';
