-- CreateTable
CREATE TABLE "RegistroAcceso" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroAcceso_userId_createdAt_idx" ON "RegistroAcceso"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RegistroAcceso_createdAt_idx" ON "RegistroAcceso"("createdAt");

-- AddForeignKey
ALTER TABLE "RegistroAcceso" ADD CONSTRAINT "RegistroAcceso_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
