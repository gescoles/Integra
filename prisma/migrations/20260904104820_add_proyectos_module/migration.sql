-- Modulo Proyectos: ventanas (tipos de proyecto), grupos y tipos de nota.

-- CreateTable
CREATE TABLE "ProyectoVentana" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProyectoVentana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoGrupo" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "ventanaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciclo" TEXT NOT NULL,
    "alumnosIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fechaEntrega" TIMESTAMP(3) NOT NULL,
    "notaFinal" DOUBLE PRECISION,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProyectoGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoNota" (
    "id" TEXT NOT NULL,
    "proyectoGrupoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "porcentaje" DOUBLE PRECISION NOT NULL,
    "valor" DOUBLE PRECISION,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProyectoNota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProyectoVentana_nombre_key" ON "ProyectoVentana"("nombre");

-- CreateIndex
CREATE INDEX "ProyectoGrupo_schoolId_idx" ON "ProyectoGrupo"("schoolId");

-- CreateIndex
CREATE INDEX "ProyectoGrupo_creadoPorId_idx" ON "ProyectoGrupo"("creadoPorId");

-- AddForeignKey
ALTER TABLE "ProyectoGrupo" ADD CONSTRAINT "ProyectoGrupo_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoGrupo" ADD CONSTRAINT "ProyectoGrupo_ventanaId_fkey" FOREIGN KEY ("ventanaId") REFERENCES "ProyectoVentana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoGrupo" ADD CONSTRAINT "ProyectoGrupo_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoNota" ADD CONSTRAINT "ProyectoNota_proyectoGrupoId_fkey" FOREIGN KEY ("proyectoGrupoId") REFERENCES "ProyectoGrupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ventana por defecto, para que el modulo no aparezca vacio el primer dia.
INSERT INTO "ProyectoVentana" ("id", "nombre", "orden") VALUES ('cm00proyectointermod01', 'Projecte Intermodular', 0);
