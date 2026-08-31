-- Quitamos el departamento en texto libre que se había añadido antes...
ALTER TABLE "CertificacionCatalogo" DROP COLUMN "departamento";

-- ...y lo sustituimos por una relación real: centro concreto (opcional —
-- sin centro, el curso vale para todos) y departamento real de ese
-- centro (los departamentos siempre pertenecen a un centro).
ALTER TABLE "CertificacionCatalogo" ADD COLUMN "schoolId" TEXT;
ALTER TABLE "CertificacionCatalogo" ADD COLUMN "departamentoId" TEXT;

ALTER TABLE "CertificacionCatalogo" ADD CONSTRAINT "CertificacionCatalogo_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CertificacionCatalogo" ADD CONSTRAINT "CertificacionCatalogo_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
