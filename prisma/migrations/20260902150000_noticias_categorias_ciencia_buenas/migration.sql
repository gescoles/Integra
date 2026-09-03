-- AlterEnum: dos categorías nuevas para /noticias, además de CENTRO y
-- EDUCACION_ESPANA — el refresco automático diario ahora también añade
-- ciencia y buenas noticias, no solo actualidad educativa.
ALTER TYPE "NoticiaCategoria" ADD VALUE IF NOT EXISTS 'CIENCIA';
ALTER TYPE "NoticiaCategoria" ADD VALUE IF NOT EXISTS 'BUENAS_NOTICIAS';
