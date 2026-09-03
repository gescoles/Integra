-- AlterEnum: nueva categoría para /noticias — inteligencia artificial,
-- separada de "Ciencia" general porque tiene entidad propia.
ALTER TYPE "NoticiaCategoria" ADD VALUE IF NOT EXISTS 'IA';
