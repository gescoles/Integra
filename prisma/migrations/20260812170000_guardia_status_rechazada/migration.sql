-- AlterEnum: se añade RECHAZADA. PROGRAMADA se deja tal cual en la base de
-- datos (Postgres no permite quitar valores de un enum sin recrearlo, y no
-- merece la pena el riesgo); simplemente la app deja de usarla a partir de
-- ahora y las filas existentes con ese valor se migran a PENDIENTE abajo.
ALTER TYPE "GuardiaStatus" ADD VALUE 'RECHAZADA';

-- AlterTable
ALTER TABLE "Guardia" ALTER COLUMN "status" SET DEFAULT 'PENDIENTE';

-- Migra datos: las guardias que estaban en "PROGRAMADA" (estado que ya no
-- se usa) pasan a "PENDIENTE", que es su equivalente real.
UPDATE "Guardia" SET "status" = 'PENDIENTE' WHERE "status" = 'PROGRAMADA';
