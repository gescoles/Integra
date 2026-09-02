-- AlterTable
ALTER TABLE "School" ADD COLUMN "ticUserId" TEXT;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_ticUserId_fkey" FOREIGN KEY ("ticUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "EstadoGafasVR" AS ENUM ('RESERVADA', 'DEVUELTA');

-- CreateTable
CREATE TABLE "GafasVRReserva" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "estado" "EstadoGafasVR" NOT NULL DEFAULT 'RESERVADA',
    "devueltoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GafasVRReserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GafasVRReserva_schoolId_fecha_idx" ON "GafasVRReserva"("schoolId", "fecha");

-- AddForeignKey
ALTER TABLE "GafasVRReserva" ADD CONSTRAINT "GafasVRReserva_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GafasVRReserva" ADD CONSTRAINT "GafasVRReserva_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
