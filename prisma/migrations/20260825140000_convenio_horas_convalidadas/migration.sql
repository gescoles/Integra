-- AlterTable: sustituye el checkbox "convalida" por un número de horas convalidadas
ALTER TABLE "Convenio" ADD COLUMN "horasConvalidadas" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Convenio" DROP COLUMN "convalida";
