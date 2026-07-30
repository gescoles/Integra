-- CreateEnum
CREATE TYPE "ConQuien" AS ENUM ('FAMILIA', 'ALUMNO');

-- CreateEnum
CREATE TYPE "MedioContacto" AS ENUM ('TELEFONO', 'EMAIL', 'PRESENCIAL', 'APP');

-- CreateEnum
CREATE TYPE "RiesgoNivel" AS ENUM ('BAJO', 'MEDIO', 'ALTO');

-- AlterTable
ALTER TABLE "Tutoria" ADD COLUMN     "alumnoId" TEXT,
ADD COLUMN     "conQuien" "ConQuien",
ADD COLUMN     "medio" "MedioContacto",
ADD COLUMN     "notas" TEXT;

-- CreateTable
CREATE TABLE "Alumno" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "profesorId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "curso" TEXT NOT NULL,
    "edad" INTEGER,
    "riesgo" "RiesgoNivel" NOT NULL DEFAULT 'BAJO',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alumno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlumnoContacto" (
    "id" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "relacion" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,

    CONSTRAINT "AlumnoContacto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Tutoria" ADD CONSTRAINT "Tutoria_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alumno" ADD CONSTRAINT "Alumno_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alumno" ADD CONSTRAINT "Alumno_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlumnoContacto" ADD CONSTRAINT "AlumnoContacto_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
