-- DropForeignKey (relación antigua, sustituida por el creador/tutor del expediente)
ALTER TABLE "Incidencia" DROP CONSTRAINT IF EXISTS "Incidencia_sancionPorId_fkey";

-- AlterTable: quitamos del todo los campos antiguos de sanción/expediente de Incidencia
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "sancionDias";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "sancionMotivo";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "sancionFecha";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "sancionPorId";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteNumero";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteFechaInicio";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteFets";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteTestimonis";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteInformeTutor";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteAudienciaResumen";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteValoracionComision";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteMedidasProvisionales";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteFechaAplicacionInicio";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteFechaAplicacionFin";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteRecursoEstado";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteDireccionNombre";
ALTER TABLE "Incidencia" DROP COLUMN IF EXISTS "expedienteCoordinadorNombre";

-- CreateEnum
CREATE TYPE "EstadoExpediente" AS ENUM ('BORRADOR', 'ENVIADO');

-- CreateTable
CREATE TABLE "Expediente" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "incidenciaId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "estado" "EstadoExpediente" NOT NULL DEFAULT 'BORRADOR',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fets" TEXT NOT NULL,
    "testimonis" TEXT NOT NULL,
    "informeTutor" TEXT NOT NULL,
    "audienciaResumen" TEXT NOT NULL,
    "valoracionComision" TEXT NOT NULL,
    "medidasProvisionales" TEXT NOT NULL,
    "sancionDias" INTEGER NOT NULL,
    "sancionMotivo" TEXT NOT NULL,
    "fechaAplicacionInicio" TIMESTAMP(3) NOT NULL,
    "fechaAplicacionFin" TIMESTAMP(3) NOT NULL,
    "recursoEstado" TEXT NOT NULL,
    "direccionNombre" TEXT NOT NULL,
    "coordinadorNombre" TEXT NOT NULL,
    "enviadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expediente_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_incidenciaId_fkey" FOREIGN KEY ("incidenciaId") REFERENCES "Incidencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
