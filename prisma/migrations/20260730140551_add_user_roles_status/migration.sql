-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COORDINADOR';
ALTER TYPE "Role" ADD VALUE 'PROFESOR';

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVO', 'INACTIVO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dni" TEXT,
ADD COLUMN     "lastAccessAt" TIMESTAMP(3),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVO';

-- CreateIndex
CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");
