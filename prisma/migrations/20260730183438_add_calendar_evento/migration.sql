-- CreateTable
CREATE TABLE "CalendarEvento" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2F6FED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarEvento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CalendarEvento" ADD CONSTRAINT "CalendarEvento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
