-- CreateTable
CREATE TABLE "Configuracion" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "loginPasswordHabilitado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- Crea la única fila que va a existir siempre, para no tener que
-- comprobar en el código si existe o no.
INSERT INTO "Configuracion" ("id", "loginPasswordHabilitado") VALUES ('global', false);
