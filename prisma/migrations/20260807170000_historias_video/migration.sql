-- CreateEnum
CREATE TYPE "TipoHistoria" AS ENUM ('IMAGEN', 'VIDEO');

-- AlterTable
ALTER TABLE "Historia" ADD COLUMN "tipo" "TipoHistoria" NOT NULL DEFAULT 'IMAGEN';
