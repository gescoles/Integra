-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN "departamentoId" TEXT;

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "EmpresaObservacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpresaObservacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmpresaObservacion" ADD CONSTRAINT "EmpresaObservacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migra la observación única que ya hubiera a la primera nota del hilo,
-- para no perder lo que ya se había escrito.
INSERT INTO "EmpresaObservacion" ("id", "empresaId", "texto", "usuarioNombre", "createdAt")
SELECT md5(random()::text || clock_timestamp()::text || "id"), "id", "observaciones", 'Migración automática', "updatedAt"
FROM "Empresa"
WHERE "observaciones" IS NOT NULL AND length(trim("observaciones")) > 0;
