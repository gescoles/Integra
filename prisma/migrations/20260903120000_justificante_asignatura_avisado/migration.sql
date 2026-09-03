-- AlterTable: asignatura (texto libre) y a quién avisar por email +
-- notificación al justificar la hora.
ALTER TABLE "JustificanteAsistencia" ADD COLUMN "asignatura" TEXT;
ALTER TABLE "JustificanteAsistencia" ADD COLUMN "avisadoId" TEXT;

-- AddForeignKey
ALTER TABLE "JustificanteAsistencia" ADD CONSTRAINT "JustificanteAsistencia_avisadoId_fkey" FOREIGN KEY ("avisadoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
