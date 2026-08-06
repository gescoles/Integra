-- CreateEnum
CREATE TYPE "TipoTutoriaSeguimiento" AS ENUM ('INICIAL', 'MEDIA', 'FINAL');

-- AlterTable: Convenio - campos de cierre
ALTER TABLE "Convenio" ADD COLUMN "cerrado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Convenio" ADD COLUMN "notaFinal" TEXT;
ALTER TABLE "Convenio" ADD COLUMN "fechaCierre" TIMESTAMP(3);
ALTER TABLE "Convenio" ADD COLUMN "cerradoPorId" TEXT;

-- AddForeignKey
ALTER TABLE "Convenio" ADD CONSTRAINT "Convenio_cerradoPorId_fkey" FOREIGN KEY ("cerradoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: TutoriaSeguimiento
CREATE TABLE "TutoriaSeguimiento" (
    "id" TEXT NOT NULL,
    "convenioId" TEXT NOT NULL,
    "tipo" "TipoTutoriaSeguimiento" NOT NULL,
    "fecha" TIMESTAMP(3),
    "resumen" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutoriaSeguimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutoriaSeguimiento_convenioId_tipo_key" ON "TutoriaSeguimiento"("convenioId", "tipo");

-- AddForeignKey
ALTER TABLE "TutoriaSeguimiento" ADD CONSTRAINT "TutoriaSeguimiento_convenioId_fkey" FOREIGN KEY ("convenioId") REFERENCES "Convenio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutoriaSeguimiento" ADD CONSTRAINT "TutoriaSeguimiento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: Prorroga - se amplía con los mismos campos que un Convenio
ALTER TABLE "Prorroga" ADD COLUMN "tipologia" TEXT;
ALTER TABLE "Prorroga" ADD COLUMN "estadoAcuerdo" TEXT;
ALTER TABLE "Prorroga" ADD COLUMN "convalida" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Prorroga" ADD COLUMN "quienAltaBajaSS" TEXT;
ALTER TABLE "Prorroga" ADD COLUMN "periodo" TEXT;
ALTER TABLE "Prorroga" ADD COLUMN "empresaCif" TEXT;
ALTER TABLE "Prorroga" ADD COLUMN "empresaNombre" TEXT;
ALTER TABLE "Prorroga" ADD COLUMN "tutorEmpresaNombre" TEXT;
ALTER TABLE "Prorroga" ADD COLUMN "tutorEmpresaTelefono" TEXT;
ALTER TABLE "Prorroga" ADD COLUMN "tutorEmpresaCorreo" TEXT;
ALTER TABLE "Prorroga" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "Prorroga" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Prorroga" ALTER COLUMN "updatedAt" SET NOT NULL;
