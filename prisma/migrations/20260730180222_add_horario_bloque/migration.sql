-- CreateTable
CREATE TABLE "HorarioBloque" (
    "id" TEXT NOT NULL,
    "profesorId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "asignatura" TEXT NOT NULL,
    "grupo" TEXT,
    "color" TEXT NOT NULL DEFAULT '#2F6FED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorarioBloque_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HorarioBloque" ADD CONSTRAINT "HorarioBloque_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
