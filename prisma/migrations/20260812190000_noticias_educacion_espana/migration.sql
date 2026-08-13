-- CreateEnum
CREATE TYPE "NoticiaCategoria" AS ENUM ('CENTRO', 'EDUCACION_ESPANA');

-- AlterTable: schoolId pasa a ser opcional (las noticias de la categoría
-- "Educación en España" no están ligadas a ningún centro).
ALTER TABLE "Noticia" ALTER COLUMN "schoolId" DROP NOT NULL;
ALTER TABLE "Noticia" ADD COLUMN "categoria" "NoticiaCategoria" NOT NULL DEFAULT 'CENTRO';
ALTER TABLE "Noticia" ADD COLUMN "fuenteNombre" TEXT;
ALTER TABLE "Noticia" ADD COLUMN "fuenteUrl" TEXT;

-- Recrea la FK para permitir SET NULL en vez de bloquear el borrado de un
-- centro si tiene noticias asociadas.
ALTER TABLE "Noticia" DROP CONSTRAINT "Noticia_schoolId_fkey";
ALTER TABLE "Noticia" ADD CONSTRAINT "Noticia_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
