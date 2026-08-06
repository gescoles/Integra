-- CreateEnum
CREATE TYPE "SalidaEstado" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "Salida" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "curso" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "actividad" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaSalida" TEXT NOT NULL,
    "horaVuelta" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "profesoresIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "numAlumnos" INTEGER NOT NULL,
    "costo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moneda" TEXT NOT NULL DEFAULT 'EUR',
    "observaciones" TEXT,
    "calendarioSustituciones" TEXT,
    "estado" "SalidaEstado" NOT NULL DEFAULT 'PENDIENTE',
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salida_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Salida" ADD CONSTRAINT "Salida_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salida" ADD CONSTRAINT "Salida_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salida" ADD CONSTRAINT "Salida_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
