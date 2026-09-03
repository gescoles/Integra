-- CreateTable
CREATE TABLE "JustificanteAsistencia" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "entregado" BOOLEAN NOT NULL DEFAULT false,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JustificanteAsistencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JustificanteAsistencia_alumnoId_idx" ON "JustificanteAsistencia"("alumnoId");

-- CreateIndex
CREATE INDEX "JustificanteAsistencia_schoolId_fecha_idx" ON "JustificanteAsistencia"("schoolId", "fecha");

-- AddForeignKey
ALTER TABLE "JustificanteAsistencia" ADD CONSTRAINT "JustificanteAsistencia_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JustificanteAsistencia" ADD CONSTRAINT "JustificanteAsistencia_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JustificanteAsistencia" ADD CONSTRAINT "JustificanteAsistencia_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
