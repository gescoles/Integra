-- CreateEnum
CREATE TYPE "EstadoPresencia" AS ENUM ('DISPONIBLE', 'AUSENTE', 'DESCONECTADO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "estadoPresencia" "EstadoPresencia" NOT NULL DEFAULT 'DESCONECTADO';

-- CreateTable
CREATE TABLE "ChatMensaje" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "emisorId" TEXT NOT NULL,
    "receptorId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMensaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMensaje_emisorId_receptorId_idx" ON "ChatMensaje"("emisorId", "receptorId");

-- CreateIndex
CREATE INDEX "ChatMensaje_receptorId_leido_idx" ON "ChatMensaje"("receptorId", "leido");

-- AddForeignKey
ALTER TABLE "ChatMensaje" ADD CONSTRAINT "ChatMensaje_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMensaje" ADD CONSTRAINT "ChatMensaje_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMensaje" ADD CONSTRAINT "ChatMensaje_receptorId_fkey" FOREIGN KEY ("receptorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
