-- AlterTable
ALTER TABLE "School" ADD COLUMN "grupos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Precarga los grupos reales de iMES (los mismos ciclos y cursos que ya
-- aparecen en la página pública /centros/imes). Si el nombre del centro
-- cambia en el futuro, este UPDATE simplemente no encontrará ninguna fila
-- y no hace nada — no falla, no rompe nada.
UPDATE "School"
SET "grupos" = ARRAY[
  'BAD1', 'BAD2',
  'BAE1', 'BAE2',
  'BAU1', 'BAU2',
  'BPM1', 'BPM2',
  'BHU1', 'BHU2',
  'BSO1', 'BSO2',
  'AC1', 'AC2',
  'PM1', 'PM2',
  'CI1', 'CI2',
  'SIMIX1', 'SIMIX2',
  'ASIX1', 'ASIX2',
  'DAM1', 'DAM2',
  'AF1', 'AF2',
  'CAI1',
  'DIET1', 'DIET2',
  'EI1', 'EI2',
  'IS1', 'IS2'
]::TEXT[]
WHERE "name" ILIKE '%iMES%';
