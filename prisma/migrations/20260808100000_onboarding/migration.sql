-- CreateTable
CREATE TABLE "OnboardingCarpeta" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingCarpeta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OnboardingCarpeta" ADD CONSTRAINT "OnboardingCarpeta_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingCarpeta" ADD CONSTRAINT "OnboardingCarpeta_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "OnboardingArchivo" (
    "id" TEXT NOT NULL,
    "carpetaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT,
    "tamano" INTEGER,
    "subidoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingArchivo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OnboardingArchivo" ADD CONSTRAINT "OnboardingArchivo_carpetaId_fkey" FOREIGN KEY ("carpetaId") REFERENCES "OnboardingCarpeta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingArchivo" ADD CONSTRAINT "OnboardingArchivo_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
