-- CreateTable
CREATE TABLE "CertificacionAsignacion" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "catalogoId" TEXT NOT NULL,
    "profesorId" TEXT NOT NULL,
    "asignadoPorId" TEXT,
    "certificacionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificacionAsignacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificacionAsignacion_certificacionId_key" ON "CertificacionAsignacion"("certificacionId");

-- CreateIndex
CREATE INDEX "CertificacionAsignacion_profesorId_idx" ON "CertificacionAsignacion"("profesorId");

-- CreateIndex
CREATE INDEX "CertificacionAsignacion_schoolId_idx" ON "CertificacionAsignacion"("schoolId");

-- AddForeignKey
ALTER TABLE "CertificacionAsignacion" ADD CONSTRAINT "CertificacionAsignacion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificacionAsignacion" ADD CONSTRAINT "CertificacionAsignacion_catalogoId_fkey" FOREIGN KEY ("catalogoId") REFERENCES "CertificacionCatalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificacionAsignacion" ADD CONSTRAINT "CertificacionAsignacion_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificacionAsignacion" ADD CONSTRAINT "CertificacionAsignacion_asignadoPorId_fkey" FOREIGN KEY ("asignadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificacionAsignacion" ADD CONSTRAINT "CertificacionAsignacion_certificacionId_fkey" FOREIGN KEY ("certificacionId") REFERENCES "Certificacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
