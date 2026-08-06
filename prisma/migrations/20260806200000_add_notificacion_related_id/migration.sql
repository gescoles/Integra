-- AlterTable
ALTER TABLE "Notificacion" ADD COLUMN "relatedId" TEXT;

-- CreateIndex
CREATE INDEX "Notificacion_relatedId_idx" ON "Notificacion"("relatedId");
