-- CreateEnum
CREATE TYPE "NoticiaModo" AS ENUM ('SIMPLE', 'PERSONALIZADO');

-- CreateTable
CREATE TABLE "Noticia" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "autorId" TEXT,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "imagenPortada" TEXT,
    "modo" "NoticiaModo" NOT NULL DEFAULT 'SIMPLE',
    "cuerpoHtml" TEXT NOT NULL,
    "cssPersonalizado" TEXT,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Noticia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Noticia_slug_key" ON "Noticia"("slug");

-- AddForeignKey
ALTER TABLE "Noticia" ADD CONSTRAINT "Noticia_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Noticia" ADD CONSTRAINT "Noticia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
