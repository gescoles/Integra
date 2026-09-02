-- AlterTable: correo del director configurable por centro
ALTER TABLE "School" ADD COLUMN "directorPIEmail" TEXT;

-- AlterTable: idioma del documento (castellano/catalán)
ALTER TABLE "PIDocumento" ADD COLUMN "idioma" TEXT NOT NULL DEFAULT 'CA';

-- AlterTable: se quitan las reuniones y acuerdos de continuidad, no
-- estaban en el Word real.
ALTER TABLE "PIDocumento" DROP COLUMN "reunionesAlumnoFamilia";
ALTER TABLE "PIDocumento" DROP COLUMN "reunionesProfesionales";
ALTER TABLE "PIDocumento" DROP COLUMN "acuerdosContinuidad";

-- CreateTable: documentos adjuntos a la ficha del alumno
CREATE TABLE "AlumnoPIDocumento" (
    "id" TEXT NOT NULL,
    "alumnoPiId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT,
    "tamano" INTEGER,
    "subidoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlumnoPIDocumento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AlumnoPIDocumento" ADD CONSTRAINT "AlumnoPIDocumento_alumnoPiId_fkey" FOREIGN KEY ("alumnoPiId") REFERENCES "AlumnoPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlumnoPIDocumento" ADD CONSTRAINT "AlumnoPIDocumento_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
