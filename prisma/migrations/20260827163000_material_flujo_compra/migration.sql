-- Cambiamos el significado del enum de Material: antes eran niveles de
-- stock (EN_STOCK/BAJO_STOCK/AGOTADO), ahora son pasos de un flujo real
-- de compra (PENDIENTE_VALIDACION -> VALIDADO_PENDIENTE_COMPRA -> COMPRADO).

-- 1. Nuevo tipo con los estados nuevos
CREATE TYPE "MaterialEstado_new" AS ENUM ('PENDIENTE_VALIDACION', 'VALIDADO_PENDIENTE_COMPRA', 'COMPRADO');

-- 2. Columnas nuevas de seguimiento
ALTER TABLE "MaterialRequest" ADD COLUMN "validadoPorId" TEXT;
ALTER TABLE "MaterialRequest" ADD COLUMN "validadoEn" TIMESTAMP(3);
ALTER TABLE "MaterialRequest" ADD COLUMN "compradoPorId" TEXT;
ALTER TABLE "MaterialRequest" ADD COLUMN "compradoEn" TIMESTAMP(3);

-- 3. Migrar la columna "estado" al nuevo tipo. Cualquier fila que ya
-- existiera con un estado antiguo (EN_STOCK/BAJO_STOCK/AGOTADO) se trata
-- como ya comprada, para no perder ni bloquear datos de prueba previos.
ALTER TABLE "MaterialRequest" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "MaterialRequest" ALTER COLUMN "estado" TYPE TEXT USING "estado"::TEXT;
UPDATE "MaterialRequest" SET "estado" = 'COMPRADO' WHERE "estado" IN ('EN_STOCK', 'BAJO_STOCK', 'AGOTADO');
DROP TYPE "MaterialEstado";
ALTER TYPE "MaterialEstado_new" RENAME TO "MaterialEstado";
ALTER TABLE "MaterialRequest" ALTER COLUMN "estado" TYPE "MaterialEstado" USING "estado"::"MaterialEstado";
ALTER TABLE "MaterialRequest" ALTER COLUMN "estado" SET DEFAULT 'PENDIENTE_VALIDACION';

-- 4. Relaciones a User
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_validadoPorId_fkey" FOREIGN KEY ("validadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_compradoPorId_fkey" FOREIGN KEY ("compradoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
