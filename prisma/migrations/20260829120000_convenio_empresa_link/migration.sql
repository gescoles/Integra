-- AlterTable
ALTER TABLE "Convenio" ADD COLUMN "empresaId" TEXT;

-- AddForeignKey
ALTER TABLE "Convenio" ADD CONSTRAINT "Convenio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
