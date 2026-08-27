-- AlterEnum
ALTER TYPE "SalidaEstado" ADD VALUE 'ANULADA';

-- AlterTable
ALTER TABLE "Salida" ADD COLUMN "motivoAnulacion" TEXT;
ALTER TABLE "Salida" ADD COLUMN "anuladaPorId" TEXT;
ALTER TABLE "Salida" ADD COLUMN "fechaAnulacion" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Salida" ADD CONSTRAINT "Salida_anuladaPorId_fkey" FOREIGN KEY ("anuladaPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
