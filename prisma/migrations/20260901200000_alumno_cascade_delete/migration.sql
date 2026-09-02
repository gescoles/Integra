-- Para poder borrar un alumno, todo lo que cuelga de él tiene que
-- borrarse en cascada — hasta ahora estas relaciones no lo permitían,
-- por eso saltaba el error de clave foránea al intentar eliminarlo.

ALTER TABLE "Incidencia" DROP CONSTRAINT "Incidencia_alumnoId_fkey";
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Expediente" DROP CONSTRAINT "Expediente_alumnoId_fkey";
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Expediente" DROP CONSTRAINT "Expediente_incidenciaId_fkey";
ALTER TABLE "Expediente" ADD CONSTRAINT "Expediente_incidenciaId_fkey" FOREIGN KEY ("incidenciaId") REFERENCES "Incidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Tutoria" DROP CONSTRAINT "Tutoria_alumnoId_fkey";
ALTER TABLE "Tutoria" ADD CONSTRAINT "Tutoria_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AlumnoContacto" DROP CONSTRAINT "AlumnoContacto_alumnoId_fkey";
ALTER TABLE "AlumnoContacto" ADD CONSTRAINT "AlumnoContacto_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PracticaAlumno" DROP CONSTRAINT "PracticaAlumno_alumnoId_fkey";
ALTER TABLE "PracticaAlumno" ADD CONSTRAINT "PracticaAlumno_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AlumnoPI" DROP CONSTRAINT "AlumnoPI_alumnoId_fkey";
ALTER TABLE "AlumnoPI" ADD CONSTRAINT "AlumnoPI_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: historial de acciones sobre cada alumno
CREATE TABLE "AlumnoHistorial" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,
    "hechoPorId" TEXT,
    "hechoPorNombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlumnoHistorial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlumnoHistorial_alumnoId_createdAt_idx" ON "AlumnoHistorial"("alumnoId", "createdAt");

ALTER TABLE "AlumnoHistorial" ADD CONSTRAINT "AlumnoHistorial_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
