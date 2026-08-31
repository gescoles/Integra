-- AlterTable: los mensajes se quedan aunque se borre quien los envió o
-- recibió — solo pierden el vínculo con ese usuario.
ALTER TABLE "ChatMensaje" ALTER COLUMN "emisorId" DROP NOT NULL;
ALTER TABLE "ChatMensaje" ALTER COLUMN "receptorId" DROP NOT NULL;

ALTER TABLE "ChatMensaje" DROP CONSTRAINT IF EXISTS "ChatMensaje_emisorId_fkey";
ALTER TABLE "ChatMensaje" ADD CONSTRAINT "ChatMensaje_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatMensaje" DROP CONSTRAINT IF EXISTS "ChatMensaje_receptorId_fkey";
ALTER TABLE "ChatMensaje" ADD CONSTRAINT "ChatMensaje_receptorId_fkey" FOREIGN KEY ("receptorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
