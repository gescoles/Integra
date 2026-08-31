-- CreateEnum
CREATE TYPE "EstadoBloqueo" AS ENUM ('PENDIENTE', 'RESUELTO');

-- CreateTable
CREATE TABLE "BloqueoAcceso" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cantidadIntentos" INTEGER NOT NULL,
    "primerIntento" TIMESTAMP(3) NOT NULL,
    "ultimoIntento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoBloqueo" NOT NULL DEFAULT 'PENDIENTE',
    "resueltoPorId" TEXT,
    "resueltoPorNombre" TEXT,
    "accionResolucion" TEXT,
    "resueltoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloqueoAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BloqueoAcceso_email_estado_idx" ON "BloqueoAcceso"("email", "estado");

-- CreateIndex
CREATE INDEX "BloqueoAcceso_estado_createdAt_idx" ON "BloqueoAcceso"("estado", "createdAt");
