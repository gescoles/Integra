-- AlterTable
ALTER TABLE "Incidencia" ADD COLUMN "expedienteNumero" TEXT;
ALTER TABLE "Incidencia" ADD COLUMN "expedienteFechaInicio" TIMESTAMP(3);
ALTER TABLE "Incidencia" ADD COLUMN "expedienteFets" TEXT;
ALTER TABLE "Incidencia" ADD COLUMN "expedienteTestimonis" TEXT;
ALTER TABLE "Incidencia" ADD COLUMN "expedienteInformeTutor" TEXT;
ALTER TABLE "Incidencia" ADD COLUMN "expedienteAudienciaResumen" TEXT;
ALTER TABLE "Incidencia" ADD COLUMN "expedienteValoracionComision" TEXT;
ALTER TABLE "Incidencia" ADD COLUMN "expedienteMedidasProvisionales" TEXT;
ALTER TABLE "Incidencia" ADD COLUMN "expedienteFechaAplicacionInicio" TIMESTAMP(3);
ALTER TABLE "Incidencia" ADD COLUMN "expedienteFechaAplicacionFin" TIMESTAMP(3);
ALTER TABLE "Incidencia" ADD COLUMN "expedienteRecursoEstado" TEXT;
ALTER TABLE "Incidencia" ADD COLUMN "expedienteDireccionNombre" TEXT;
ALTER TABLE "Incidencia" ADD COLUMN "expedienteCoordinadorNombre" TEXT;
