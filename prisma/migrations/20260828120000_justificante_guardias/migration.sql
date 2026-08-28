-- CreateEnum
CREATE TYPE "EstadoJustificante" AS ENUM ('PENDIENTE', 'RECIBIDO', 'NO_APLICA');

-- AlterTable
ALTER TABLE "CoberturaGuardia" ADD COLUMN "estadoJustificante" "EstadoJustificante" NOT NULL DEFAULT 'PENDIENTE';
ALTER TABLE "CoberturaGuardia" ADD COLUMN "justificanteUrl" TEXT;
ALTER TABLE "CoberturaGuardia" ADD COLUMN "justificanteNombre" TEXT;
ALTER TABLE "CoberturaGuardia" ADD COLUMN "justificanteFecha" TIMESTAMP(3);
