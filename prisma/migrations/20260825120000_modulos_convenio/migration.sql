-- AlterTable: campos nuevos en Convenio (departamento y ciclo/grupo elegidos)
ALTER TABLE "Convenio" ADD COLUMN "departamentoId" TEXT;
ALTER TABLE "Convenio" ADD COLUMN "cicloGrupo" TEXT;

-- CreateTable: catálogo de módulos profesionales por ciclo formativo
CREATE TABLE "ModuloProfesional" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "cicloFormativo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "horasCentro" INTEGER NOT NULL,
    "horasEmpresa" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModuloProfesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable: módulos elegidos dentro de un convenio, con horas y nota
CREATE TABLE "ConvenioModulo" (
    "id" TEXT NOT NULL,
    "convenioId" TEXT NOT NULL,
    "moduloProfesionalId" TEXT NOT NULL,
    "horasEmpresa" INTEGER NOT NULL,
    "nota" TEXT,
    "notaEnviada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConvenioModulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuloProfesional_schoolId_cicloFormativo_codigo_key" ON "ModuloProfesional"("schoolId", "cicloFormativo", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ConvenioModulo_convenioId_moduloProfesionalId_key" ON "ConvenioModulo"("convenioId", "moduloProfesionalId");

-- AddForeignKey
ALTER TABLE "Convenio" ADD CONSTRAINT "Convenio_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuloProfesional" ADD CONSTRAINT "ModuloProfesional_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConvenioModulo" ADD CONSTRAINT "ConvenioModulo_convenioId_fkey" FOREIGN KEY ("convenioId") REFERENCES "Convenio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConvenioModulo" ADD CONSTRAINT "ConvenioModulo_moduloProfesionalId_fkey" FOREIGN KEY ("moduloProfesionalId") REFERENCES "ModuloProfesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
