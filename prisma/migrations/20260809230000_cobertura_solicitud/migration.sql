-- CreateEnum
CREATE TYPE "EstadoCobertura" AS ENUM ('PENDIENTE', 'ASIGNADA');

-- AlterTable: el sustituto ahora es opcional (hasta que dirección lo asigna)
ALTER TABLE "CoberturaGuardia" ALTER COLUMN "profesorSustitutoId" DROP NOT NULL;

-- AlterTable: nuevos campos
ALTER TABLE "CoberturaGuardia" ADD COLUMN "trabajoAlumnos" TEXT;
ALTER TABLE "CoberturaGuardia" ADD COLUMN "estado" "EstadoCobertura" NOT NULL DEFAULT 'ASIGNADA';
