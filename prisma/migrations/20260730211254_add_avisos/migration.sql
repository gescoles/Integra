-- CreateEnum
CREATE TYPE "AvisoCategoria" AS ENUM ('GENERAL', 'ACADEMICO', 'CONVIVENCIA');

-- CreateTable
CREATE TABLE "Aviso" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "categoria" "AvisoCategoria" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aviso_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
