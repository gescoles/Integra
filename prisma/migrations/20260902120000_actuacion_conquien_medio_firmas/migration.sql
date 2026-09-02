-- CreateEnum
CREATE TYPE "ConQuienActuacion" AS ENUM ('ALUMNO', 'FAMILIA', 'ALUMNO_FAMILIA', 'TUTOR');
CREATE TYPE "MedioActuacion" AS ENUM ('PRESENCIAL', 'MAIL', 'TELEFONICA', 'APP_IMES');

-- AlterTable: PIActuacion — "tipo" (texto libre) se sustituye por
-- "conQuien" y "medio" (desplegables fijos). Las filas que ya
-- existieran se rellenan con un valor por defecto razonable, ya que un
-- texto libre no se puede convertir automáticamente a estas opciones.
ALTER TABLE "PIActuacion" ADD COLUMN "conQuien" "ConQuienActuacion";
ALTER TABLE "PIActuacion" ADD COLUMN "medio" "MedioActuacion";
UPDATE "PIActuacion" SET "conQuien" = 'ALUMNO' WHERE "conQuien" IS NULL;
UPDATE "PIActuacion" SET "medio" = 'PRESENCIAL' WHERE "medio" IS NULL;
ALTER TABLE "PIActuacion" ALTER COLUMN "conQuien" SET NOT NULL;
ALTER TABLE "PIActuacion" ALTER COLUMN "medio" SET NOT NULL;
ALTER TABLE "PIActuacion" DROP COLUMN "tipo";

-- AlterEnum: nuevo estado de firma en paralelo tutor+director. Los
-- valores PENDIENTE_TUTOR/PENDIENTE_DIRECTOR se conservan por si algún
-- documento ya estuviera en ese estado — no se usan para documentos
-- nuevos a partir de ahora.
ALTER TYPE "EstadoPIDocumento" ADD VALUE 'PENDIENTE_TUTOR_DIRECTOR';

-- AlterTable: si la família/el alumno no quieren firmar, se marca como
-- "rechazada" en vez de guardar una imagen de firma.
ALTER TABLE "PIDocumento" ADD COLUMN "firmaFamiliaRechazada" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PIDocumento" ADD COLUMN "firmaAlumnoRechazada" BOOLEAN NOT NULL DEFAULT false;
