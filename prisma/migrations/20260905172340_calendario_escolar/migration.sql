-- Calendario Escolar: fechas oficiales del curso (festivos, trimestres,
-- semanas de examenes...), uno por centro. Editable por SuperAdmin siempre,
-- y por los profesores a los que se les active el permiso individual.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "puedeEditarCalendarioEscolar" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CalendarioEscolarEvento" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "festivo" BOOLEAN NOT NULL DEFAULT false,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarioEscolarEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarioEscolarEvento_schoolId_idx" ON "CalendarioEscolarEvento"("schoolId");

-- CreateIndex
CREATE INDEX "CalendarioEscolarEvento_fechaInicio_idx" ON "CalendarioEscolarEvento"("fechaInicio");

-- AddForeignKey
ALTER TABLE "CalendarioEscolarEvento" ADD CONSTRAINT "CalendarioEscolarEvento_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarioEscolarEvento" ADD CONSTRAINT "CalendarioEscolarEvento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
