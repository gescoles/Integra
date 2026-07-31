-- DropColumn (campos antiguos)
ALTER TABLE "MaterialRequest" DROP COLUMN "cicloModulo",
DROP COLUMN "costeEstimado",
DROP COLUMN "materialName",
DROP COLUMN "prioridad",
DROP COLUMN "status";

-- CreateEnum
CREATE TYPE "MaterialCategoria" AS ENUM ('ELECTRONICA', 'COMPONENTES', 'HERRAMIENTAS', 'OTROS');

-- CreateEnum
CREATE TYPE "MaterialEstado" AS ENUM ('EN_STOCK', 'BAJO_STOCK', 'AGOTADO');

-- AlterTable (campos nuevos)
ALTER TABLE "MaterialRequest"
ADD COLUMN "nombre" TEXT NOT NULL,
ADD COLUMN "curso" TEXT NOT NULL,
ADD COLUMN "asignatura" TEXT NOT NULL,
ADD COLUMN "precioUnidad" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "proveedor" TEXT NOT NULL,
ADD COLUMN "enlace" TEXT,
ADD COLUMN "justificacion" TEXT NOT NULL,
ADD COLUMN "categoria" "MaterialCategoria" NOT NULL DEFAULT 'OTROS',
ADD COLUMN "estado" "MaterialEstado" NOT NULL DEFAULT 'EN_STOCK';

-- DropEnum
DROP TYPE "MaterialPriority";

-- DropEnum
DROP TYPE "MaterialStatus";
