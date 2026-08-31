-- Estas relaciones son solo "quién hizo esto" en un registro que
-- pertenece a otra entidad (un evento de incidencia, una noticia, un
-- convenio de OTRO alumno, un material de OTRO profesor...). Al borrar un
-- usuario, no tiene sentido borrar esos registros — solo se pierde el
-- vínculo con el usuario que ya no existe (queda a NULL).

ALTER TABLE "IncidenciaEvento" DROP CONSTRAINT IF EXISTS "IncidenciaEvento_autorId_fkey";
ALTER TABLE "IncidenciaEvento" ADD CONSTRAINT "IncidenciaEvento_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Noticia" DROP CONSTRAINT IF EXISTS "Noticia_autorId_fkey";
ALTER TABLE "Noticia" ADD CONSTRAINT "Noticia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TutoriaSeguimiento" DROP CONSTRAINT IF EXISTS "TutoriaSeguimiento_creadoPorId_fkey";
ALTER TABLE "TutoriaSeguimiento" ADD CONSTRAINT "TutoriaSeguimiento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Convenio" DROP CONSTRAINT IF EXISTS "Convenio_cerradoPorId_fkey";
ALTER TABLE "Convenio" ADD CONSTRAINT "Convenio_cerradoPorId_fkey" FOREIGN KEY ("cerradoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PracticaAlumno" DROP CONSTRAINT IF EXISTS "PracticaAlumno_tutorImesId_fkey";
ALTER TABLE "PracticaAlumno" ADD CONSTRAINT "PracticaAlumno_tutorImesId_fkey" FOREIGN KEY ("tutorImesId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PracticaAlumno" DROP CONSTRAINT IF EXISTS "PracticaAlumno_responsablePracticasId_fkey";
ALTER TABLE "PracticaAlumno" ADD CONSTRAINT "PracticaAlumno_responsablePracticasId_fkey" FOREIGN KEY ("responsablePracticasId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaterialRequest" DROP CONSTRAINT IF EXISTS "MaterialRequest_validadoPorId_fkey";
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_validadoPorId_fkey" FOREIGN KEY ("validadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MaterialRequest" DROP CONSTRAINT IF EXISTS "MaterialRequest_compradoPorId_fkey";
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_compradoPorId_fkey" FOREIGN KEY ("compradoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Salida" DROP CONSTRAINT IF EXISTS "Salida_anuladaPorId_fkey";
ALTER TABLE "Salida" ADD CONSTRAINT "Salida_anuladaPorId_fkey" FOREIGN KEY ("anuladaPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Empresa" DROP CONSTRAINT IF EXISTS "Empresa_creadoPorId_fkey";
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
