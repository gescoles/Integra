-- CreateEnum
CREATE TYPE "EstadoCertificacion" AS ENUM ('PROXIMAMENTE', 'PROGRAMADA', 'EN_CURSO', 'ACTIVA');

-- CreateTable
CREATE TABLE "CertificacionCatalogo" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "horasDefault" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificacionCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificacion" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombreCertificacion" TEXT NOT NULL,
    "cursoAcademico" TEXT NOT NULL,
    "cicloFormativo" TEXT NOT NULL,
    "horas" INTEGER,
    "fechaInicioPreparacion" TIMESTAMP(3) NOT NULL,
    "fechaFinPreparacion" TIMESTAMP(3),
    "fechaExamen" TIMESTAMP(3),
    "estado" "EstadoCertificacion" NOT NULL DEFAULT 'PROGRAMADA',
    "codigoPue" TEXT,
    "entidadCertificadora" TEXT,
    "nivelMCE" TEXT,
    "duracionExamen" TEXT,
    "modalidad" TEXT,
    "sedeExamen" TEXT,
    "notas" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Certificacion" ADD CONSTRAINT "Certificacion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Certificacion" ADD CONSTRAINT "Certificacion_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
