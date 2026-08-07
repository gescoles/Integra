-- AlterTable
ALTER TABLE "Incidencia" ADD COLUMN "sancionDias" INTEGER;
ALTER TABLE "Incidencia" ADD COLUMN "sancionMotivo" TEXT;
ALTER TABLE "Incidencia" ADD COLUMN "sancionFecha" TIMESTAMP(3);
ALTER TABLE "Incidencia" ADD COLUMN "sancionPorId" TEXT;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_sancionPorId_fkey" FOREIGN KEY ("sancionPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
