-- CreateTable: un evento de calendario de Teams por cada profesor
-- acompañante de una salida, para poder borrarlo/actualizarlo cuando se
-- quita, se añade o cambian los datos de la salida.
CREATE TABLE "SalidaTeamsEvento" (
    "id" TEXT NOT NULL,
    "salidaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamsEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalidaTeamsEvento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SalidaTeamsEvento_salidaId_userId_key" ON "SalidaTeamsEvento"("salidaId", "userId");

CREATE INDEX "SalidaTeamsEvento_salidaId_idx" ON "SalidaTeamsEvento"("salidaId");

ALTER TABLE "SalidaTeamsEvento" ADD CONSTRAINT "SalidaTeamsEvento_salidaId_fkey" FOREIGN KEY ("salidaId") REFERENCES "Salida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SalidaTeamsEvento" ADD CONSTRAINT "SalidaTeamsEvento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
