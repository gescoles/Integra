-- AlterTable
ALTER TABLE "Salida" ADD COLUMN "departamentoId" TEXT;
ALTER TABLE "Salida" ALTER COLUMN "tipo" DROP NOT NULL;
ALTER TABLE "Salida" DROP COLUMN "vueltaDirectaCasa";

-- AddForeignKey
ALTER TABLE "Salida" ADD CONSTRAINT "Salida_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
