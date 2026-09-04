-- Reestructuracion del modulo Proyectos: se anade el nivel "Proyecto"
-- (una clase con su rubrica fija) por encima de ProyectoGrupo (los
-- grupos de alumnos que la rellenan). No habia ningun dato real que
-- preservar en el momento de esta migracion (0 filas en ProyectoGrupo).

-- DropForeignKey (formaban parte de la forma anterior de ProyectoGrupo/ProyectoNota)
ALTER TABLE "ProyectoGrupo" DROP CONSTRAINT "ProyectoGrupo_schoolId_fkey";
ALTER TABLE "ProyectoGrupo" DROP CONSTRAINT "ProyectoGrupo_ventanaId_fkey";
ALTER TABLE "ProyectoGrupo" DROP CONSTRAINT "ProyectoGrupo_creadoPorId_fkey";
ALTER TABLE "ProyectoNota" DROP CONSTRAINT "ProyectoNota_proyectoGrupoId_fkey";

-- CreateTable: Proyecto (nivel superior, una clase con su rubrica)
CREATE TABLE "Proyecto" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "ventanaId" TEXT NOT NULL,
    "ciclo" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Proyecto_schoolId_idx" ON "Proyecto"("schoolId");
CREATE INDEX "Proyecto_creadoPorId_idx" ON "Proyecto"("creadoPorId");

ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_ventanaId_fkey" FOREIGN KEY ("ventanaId") REFERENCES "ProyectoVentana"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: ProyectoTipoNota (la rubrica del proyecto)
CREATE TABLE "ProyectoTipoNota" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "porcentaje" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProyectoTipoNota_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProyectoTipoNota" ADD CONSTRAINT "ProyectoTipoNota_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: ProyectoGrupo pasa a colgar de Proyecto, ya no de schoolId/ventanaId/ciclo directamente
ALTER TABLE "ProyectoGrupo" DROP COLUMN "schoolId";
ALTER TABLE "ProyectoGrupo" DROP COLUMN "ventanaId";
ALTER TABLE "ProyectoGrupo" DROP COLUMN "ciclo";
ALTER TABLE "ProyectoGrupo" ADD COLUMN "proyectoId" TEXT NOT NULL;

-- (el indice ProyectoGrupo_schoolId_idx ya se borro solo al borrar la columna)
CREATE INDEX "ProyectoGrupo_proyectoId_idx" ON "ProyectoGrupo"("proyectoId");

ALTER TABLE "ProyectoGrupo" ADD CONSTRAINT "ProyectoGrupo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProyectoGrupo" ADD CONSTRAINT "ProyectoGrupo_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: ProyectoNota pasa a apuntar a un ProyectoTipoNota compartido, ya no lleva nombre/porcentaje propios
ALTER TABLE "ProyectoNota" DROP COLUMN "nombre";
ALTER TABLE "ProyectoNota" DROP COLUMN "porcentaje";
ALTER TABLE "ProyectoNota" ADD COLUMN "tipoNotaId" TEXT NOT NULL;

ALTER TABLE "ProyectoNota" ADD CONSTRAINT "ProyectoNota_proyectoGrupoId_fkey" FOREIGN KEY ("proyectoGrupoId") REFERENCES "ProyectoGrupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProyectoNota" ADD CONSTRAINT "ProyectoNota_tipoNotaId_fkey" FOREIGN KEY ("tipoNotaId") REFERENCES "ProyectoTipoNota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ProyectoNota_proyectoGrupoId_tipoNotaId_key" ON "ProyectoNota"("proyectoGrupoId", "tipoNotaId");
