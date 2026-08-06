-- AlterTable
ALTER TABLE "Salida" ALTER COLUMN "horaVuelta" DROP NOT NULL;
ALTER TABLE "Salida" ADD COLUMN "vueltaDirectaCasa" BOOLEAN NOT NULL DEFAULT false;
