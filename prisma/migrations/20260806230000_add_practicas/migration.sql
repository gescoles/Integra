-- CreateEnum
CREATE TYPE "Promocion" AS ENUM ('PRIMERA', 'SEGUNDA');

-- CreateTable
CREATE TABLE "Practica" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "promocion" "Promocion" NOT NULL DEFAULT 'PRIMERA',
    "cicloFormativo" TEXT,
    "anyTitulacion" TEXT,
    "tipologia" TEXT,
    "estadoAcuerdo" TEXT,
    "convalida" BOOLEAN NOT NULL DEFAULT false,
    "quienAltaBajaSS" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "fechaFinAnticipada" TIMESTAMP(3),
    "periodo" TEXT,
    "tutorImesId" TEXT,
    "dni" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "telefono" TEXT,
    "direccion" TEXT,
    "correoAlumno" TEXT,
    "cap" TEXT,
    "nuss" TEXT,
    "empresaCif" TEXT,
    "empresaNombre" TEXT,
    "tutorEmpresaNombre" TEXT,
    "tutorEmpresaTelefono" TEXT,
    "tutorEmpresaCorreo" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practica_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Practica" ADD CONSTRAINT "Practica_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practica" ADD CONSTRAINT "Practica_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practica" ADD CONSTRAINT "Practica_tutorImesId_fkey" FOREIGN KEY ("tutorImesId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
