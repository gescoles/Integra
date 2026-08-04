-- Añadir columna "causa"
ALTER TABLE "Tutoria" ADD COLUMN "causa" TEXT NOT NULL DEFAULT '';

-- Simplificar el enum de estados: NUEVA/SEGUIMIENTO/PENDIENTE -> PENDIENTE, COMPLETADA se mantiene
CREATE TYPE "TutoriaStatus_new" AS ENUM ('PENDIENTE', 'COMPLETADA');

ALTER TABLE "Tutoria" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Tutoria" ALTER COLUMN "status" TYPE "TutoriaStatus_new" USING (
  CASE "status"::text
    WHEN 'COMPLETADA' THEN 'COMPLETADA'
    ELSE 'PENDIENTE'
  END
)::"TutoriaStatus_new";

DROP TYPE "TutoriaStatus";
ALTER TYPE "TutoriaStatus_new" RENAME TO "TutoriaStatus";

ALTER TABLE "Tutoria" ALTER COLUMN "status" SET DEFAULT 'PENDIENTE';
