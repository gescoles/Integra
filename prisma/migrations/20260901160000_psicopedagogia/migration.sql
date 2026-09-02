-- AlterTable: TIC-style field for Psicopedagoga
ALTER TABLE "School" ADD COLUMN "psicopedagogaId" TEXT;
ALTER TABLE "School" ADD CONSTRAINT "School_psicopedagogaId_fkey" FOREIGN KEY ("psicopedagogaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "EstadoPIDocumento" AS ENUM ('BORRADOR', 'PENDIENTE_TUTOR', 'PENDIENTE_DIRECTOR', 'PENDIENTE_FAMILIA', 'LISTO_PARA_ENVIAR', 'CERRADO');

-- CreateTable
CREATE TABLE "AlumnoPI" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "alumnoId" TEXT NOT NULL,
    "psicopedagogaId" TEXT NOT NULL,
    "tiempoDedicado" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "tienePI" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlumnoPI_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlumnoPI_schoolId_idx" ON "AlumnoPI"("schoolId");
CREATE UNIQUE INDEX "AlumnoPI_alumnoId_key" ON "AlumnoPI"("alumnoId");

-- AddForeignKey
ALTER TABLE "AlumnoPI" ADD CONSTRAINT "AlumnoPI_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AlumnoPI" ADD CONSTRAINT "AlumnoPI_alumnoId_fkey" FOREIGN KEY ("alumnoId") REFERENCES "Alumno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AlumnoPI" ADD CONSTRAINT "AlumnoPI_psicopedagogaId_fkey" FOREIGN KEY ("psicopedagogaId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PIActuacion" (
    "id" TEXT NOT NULL,
    "alumnoPiId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "informacionExtra" TEXT NOT NULL,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PIActuacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PIActuacion" ADD CONSTRAINT "PIActuacion_alumnoPiId_fkey" FOREIGN KEY ("alumnoPiId") REFERENCES "AlumnoPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PIActuacion" ADD CONSTRAINT "PIActuacion_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PIDocumento" (
    "id" TEXT NOT NULL,
    "alumnoPiId" TEXT NOT NULL,
    "estado" "EstadoPIDocumento" NOT NULL DEFAULT 'BORRADOR',
    "cursoAcademico" TEXT NOT NULL,
    "nombreAlumno" TEXT NOT NULL,
    "estudiosEnCurso" TEXT NOT NULL,
    "fechaNacimiento" TEXT,
    "lugarNacimiento" TEXT,
    "fechaLlegadaCatalunya" TEXT,
    "tutorNombre" TEXT NOT NULL,
    "lenguaHabitual" TEXT,
    "planAnteriorSiNo" BOOLEAN,
    "medidasRecibidas" TEXT,
    "repeticionCursoSiNo" BOOLEAN,
    "repeticionCual" TEXT,
    "centrosAnteriores" TEXT,
    "fechaInicioPI" TEXT,
    "periodoValidez" TEXT,
    "otrasInfoInteres" TEXT,
    "motivoInformeNEE" BOOLEAN NOT NULL DEFAULT false,
    "motivoAvaluacioPsico" BOOLEAN NOT NULL DEFAULT false,
    "motivoAvaluacioInicial" BOOLEAN NOT NULL DEFAULT false,
    "motivoOrigenEstranger" BOOLEAN NOT NULL DEFAULT false,
    "motivoCAD" BOOLEAN NOT NULL DEFAULT false,
    "motivoCADPropuesta" TEXT,
    "motivoAltres" BOOLEAN NOT NULL DEFAULT false,
    "motivoAltresTexto" TEXT,
    "descripcionNecesidad" TEXT,
    "profesionales" JSONB,
    "medidasSoportes" JSONB,
    "horarioPersonalizadoSiNo" BOOLEAN,
    "adjuntarSiProcede" TEXT,
    "reunionesAlumnoFamilia" JSONB,
    "reunionesProfesionales" JSONB,
    "acuerdosContinuidad" JSONB,
    "tutorFirmaUserId" TEXT,
    "tutorFirmaFecha" TIMESTAMP(3),
    "directorFirmaUserId" TEXT,
    "directorFirmaFecha" TIMESTAMP(3),
    "firmaFamiliaFecha" TIMESTAMP(3),
    "firmaAlumnoFecha" TIMESTAMP(3),
    "emailFamilia" TEXT,
    "emailAlumno" TEXT,
    "enviadoFecha" TIMESTAMP(3),
    "pdfDriveFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PIDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PIDocumento_alumnoPiId_key" ON "PIDocumento"("alumnoPiId");

-- AddForeignKey
ALTER TABLE "PIDocumento" ADD CONSTRAINT "PIDocumento_alumnoPiId_fkey" FOREIGN KEY ("alumnoPiId") REFERENCES "AlumnoPI"("id") ON DELETE CASCADE ON UPDATE CASCADE;
