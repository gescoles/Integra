-- CreateTable
CREATE TABLE "IntentoLoginFallido" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentoLoginFallido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntentoLoginFallido_email_createdAt_idx" ON "IntentoLoginFallido"("email", "createdAt");
