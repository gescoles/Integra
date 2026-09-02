-- AlterTable: el tiempo dedicado ya no se escribe a mano, se calcula
-- sumando las horas de cada actuación.
ALTER TABLE "AlumnoPI" DROP COLUMN "tiempoDedicado";

-- AlterTable: tienePI ahora admite un tercer estado (vacío = NULL),
-- además de Sí (true) y No (false).
ALTER TABLE "AlumnoPI" ALTER COLUMN "tienePI" DROP NOT NULL;

-- AlterTable: horas dedicadas en cada actuación concreta.
ALTER TABLE "PIActuacion" ADD COLUMN "horasDedicadas" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PIActuacion" ALTER COLUMN "horasDedicadas" DROP DEFAULT;
