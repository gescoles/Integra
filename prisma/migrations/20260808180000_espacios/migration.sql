-- CreateTable
CREATE TABLE "EspacioPlanta" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EspacioPlanta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EspacioPlanta_schoolId_numero_key" ON "EspacioPlanta"("schoolId", "numero");

-- AddForeignKey
ALTER TABLE "EspacioPlanta" ADD CONSTRAINT "EspacioPlanta_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "EspacioAula" (
    "id" TEXT NOT NULL,
    "plantaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL,
    "ancho" DOUBLE PRECISION NOT NULL,
    "profundo" DOUBLE PRECISION NOT NULL,
    "alto" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "color" TEXT NOT NULL DEFAULT '#94A3B8',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EspacioAula_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EspacioAula" ADD CONSTRAINT "EspacioAula_plantaId_fkey" FOREIGN KEY ("plantaId") REFERENCES "EspacioPlanta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "EspacioReserva" (
    "id" TEXT NOT NULL,
    "aulaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EspacioReserva_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EspacioReserva" ADD CONSTRAINT "EspacioReserva_aulaId_fkey" FOREIGN KEY ("aulaId") REFERENCES "EspacioAula"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EspacioReserva" ADD CONSTRAINT "EspacioReserva_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EspacioReserva" ADD CONSTRAINT "EspacioReserva_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
