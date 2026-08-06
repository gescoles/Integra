-- DropTable (la tabla plana de la primera versión, sustituida por la
-- estructura en tres niveles: ficha del alumno -> convenios -> prórrogas)
DROP TABLE IF EXISTS "Practica";

-- CreateTable
CREATE TABLE "PracticaAlumno" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "promocion" "Promocion" NOT NULL DEFAULT 'PRIMERA',
    "cicloFormativo" TEXT,
    "anyTitulacion" TEXT,
    "tutorImesId" TEXT,
    "dni" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "telefono" TEXT,
    "direccion" TEXT,
    "correoAlumno" TEXT,
    "cap" TEXT,
    "nuss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticaAlumno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticaAlumno_alumnoId_key" ON "PracticaAlumno"("alumnoId");

-- AddForeignKey
ALTER TABLE "PracticaAlumno" ADD CONSTRAINT "PracticaAlumno_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticaAlumno" ADD CONSTRAINT "PracticaAlumno_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticaAlumno" ADD CONSTRAINT "PracticaAlumno_tutorImesId_fkey" FOREIGN KEY ("tutorImesId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Convenio" (
    "id" TEXT NOT NULL,
    "practicaAlumnoId" TEXT NOT NULL,
    "tipologia" TEXT,
    "estadoAcuerdo" TEXT,
    "convalida" BOOLEAN NOT NULL DEFAULT false,
    "quienAltaBajaSS" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "periodo" TEXT,
    "empresaCif" TEXT,
    "empresaNombre" TEXT,
    "tutorEmpresaNombre" TEXT,
    "tutorEmpresaTelefono" TEXT,
    "tutorEmpresaCorreo" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Convenio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Convenio" ADD CONSTRAINT "Convenio_practicaAlumnoId_fkey" FOREIGN KEY ("practicaAlumnoId") REFERENCES "PracticaAlumno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Prorroga" (
    "id" TEXT NOT NULL,
    "convenioId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prorroga_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Prorroga" ADD CONSTRAINT "Prorroga_convenioId_fkey" FOREIGN KEY ("convenioId") REFERENCES "Convenio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
