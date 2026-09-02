-- AlterTable: imagen de la firma del tutor en el PI (dibujada a mano)
ALTER TABLE "PIDocumento" ADD COLUMN "tutorFirmaImagen" TEXT;

-- AlterTable: departamento del alumno, elegido a mano al crearlo
ALTER TABLE "Alumno" ADD COLUMN "departamentoId" TEXT;
ALTER TABLE "Alumno" ADD CONSTRAINT "Alumno_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
