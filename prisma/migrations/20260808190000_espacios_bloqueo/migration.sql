-- AlterTable
ALTER TABLE "EspacioAula" ADD COLUMN "bloqueada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EspacioAula" ADD COLUMN "motivoBloqueo" TEXT;
