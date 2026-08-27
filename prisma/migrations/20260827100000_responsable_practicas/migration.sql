-- AlterTable
ALTER TABLE "PracticaAlumno" ADD COLUMN "responsablePracticasId" TEXT;

-- AddForeignKey
ALTER TABLE "PracticaAlumno" ADD CONSTRAINT "PracticaAlumno_responsablePracticasId_fkey" FOREIGN KEY ("responsablePracticasId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rellenar los registros ya existentes: por ahora, ponemos como
-- responsable al mismo que tenían puesto como "tutor" (que hasta ahora
-- era, por error, quien había creado la ficha) — así no quedan fichas
-- antiguas sin responsable asignado.
UPDATE "PracticaAlumno" SET "responsablePracticasId" = "tutorImesId" WHERE "responsablePracticasId" IS NULL;
