-- Sugerencias anónimas del profesorado, dentro de Utilidades.

-- CreateTable
CREATE TABLE "SugerenciaProfesorado" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "departamentoId" TEXT,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SugerenciaProfesorado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SugerenciaProfesorado_schoolId_idx" ON "SugerenciaProfesorado"("schoolId");

-- CreateIndex
CREATE INDEX "SugerenciaProfesorado_creadoPorId_idx" ON "SugerenciaProfesorado"("creadoPorId");

-- AddForeignKey
ALTER TABLE "SugerenciaProfesorado" ADD CONSTRAINT "SugerenciaProfesorado_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugerenciaProfesorado" ADD CONSTRAINT "SugerenciaProfesorado_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SugerenciaProfesorado" ADD CONSTRAINT "SugerenciaProfesorado_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
