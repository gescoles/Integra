-- CreateTable
CREATE TABLE "UserHistorial" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "detalle" TEXT,
    "hechoPorId" TEXT,
    "hechoPorNombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserHistorial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserHistorial_userId_createdAt_idx" ON "UserHistorial"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserHistorial" ADD CONSTRAINT "UserHistorial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
