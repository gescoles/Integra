-- CreateTable
CREATE TABLE "CoberturaGuardia" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "profesorAusenteId" TEXT NOT NULL,
    "profesorSustitutoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "asignatura" TEXT,
    "grupo" TEXT,
    "ubicacion" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoberturaGuardia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CoberturaGuardia" ADD CONSTRAINT "CoberturaGuardia_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoberturaGuardia" ADD CONSTRAINT "CoberturaGuardia_profesorAusenteId_fkey" FOREIGN KEY ("profesorAusenteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoberturaGuardia" ADD CONSTRAINT "CoberturaGuardia_profesorSustitutoId_fkey" FOREIGN KEY ("profesorSustitutoId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoberturaGuardia" ADD CONSTRAINT "CoberturaGuardia_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
