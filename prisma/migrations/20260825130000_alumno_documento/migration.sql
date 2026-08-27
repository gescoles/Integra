-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'NIE', 'PASAPORTE');

-- AlterTable
ALTER TABLE "Alumno" ADD COLUMN "fechaNacimiento" TIMESTAMP(3);
ALTER TABLE "Alumno" ADD COLUMN "tipoDocumento" "TipoDocumento";
ALTER TABLE "Alumno" ADD COLUMN "numeroDocumento" TEXT;
ALTER TABLE "Alumno" ADD COLUMN "direccion" TEXT;
