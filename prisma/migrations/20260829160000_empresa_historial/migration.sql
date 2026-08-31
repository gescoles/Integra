-- CreateTable
CREATE TABLE "EmpresaHistorial" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpresaHistorial_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmpresaHistorial" ADD CONSTRAINT "EmpresaHistorial_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
