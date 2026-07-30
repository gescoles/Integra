-- CreateEnum
CREATE TYPE "TutoriaStatus" AS ENUM ('NUEVA', 'SEGUIMIENTO', 'COMPLETADA', 'PENDIENTE');

-- CreateEnum
CREATE TYPE "GuardiaStatus" AS ENUM ('PROGRAMADA', 'CUBIERTA', 'PENDIENTE');

-- CreateEnum
CREATE TYPE "MaterialPriority" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('PENDIENTE', 'EN_REVISION', 'APROBADO');

-- CreateTable
CREATE TABLE "Tutoria" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "profesorId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "cicloModulo" TEXT,
    "status" "TutoriaStatus" NOT NULL DEFAULT 'NUEVA',
    "sessionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tutoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardia" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "profesorId" TEXT NOT NULL,
    "turno" TEXT NOT NULL,
    "ubicacion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "status" "GuardiaStatus" NOT NULL DEFAULT 'PROGRAMADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guardia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequest" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "profesorId" TEXT NOT NULL,
    "cicloModulo" TEXT NOT NULL,
    "materialName" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "prioridad" "MaterialPriority" NOT NULL DEFAULT 'MEDIA',
    "costeEstimado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "MaterialStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Tutoria" ADD CONSTRAINT "Tutoria_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tutoria" ADD CONSTRAINT "Tutoria_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardia" ADD CONSTRAINT "Guardia_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardia" ADD CONSTRAINT "Guardia_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
