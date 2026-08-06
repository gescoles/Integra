-- AlterTable
ALTER TABLE "School" ADD COLUMN "cursoAcademico" TEXT;

-- CreateTable
CREATE TABLE "Historia" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "imagenUrl" TEXT NOT NULL,
    "texto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Historia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Historia" ADD CONSTRAINT "Historia_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Historia" ADD CONSTRAINT "Historia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "HistoriaVista" (
    "id" TEXT NOT NULL,
    "historiaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vistoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriaVista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HistoriaVista_historiaId_userId_key" ON "HistoriaVista"("historiaId", "userId");

-- AddForeignKey
ALTER TABLE "HistoriaVista" ADD CONSTRAINT "HistoriaVista_historiaId_fkey" FOREIGN KEY ("historiaId") REFERENCES "Historia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaVista" ADD CONSTRAINT "HistoriaVista_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
