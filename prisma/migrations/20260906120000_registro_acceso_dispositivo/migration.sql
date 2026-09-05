-- Añade info de dispositivo/IP/ubicación a cada registro de acceso, para
-- poder detectar inicios de sesión desde un dispositivo nuevo y avisar
-- por email.

-- AlterTable
ALTER TABLE "RegistroAcceso" ADD COLUMN "ip" TEXT;
ALTER TABLE "RegistroAcceso" ADD COLUMN "dispositivo" TEXT;
ALTER TABLE "RegistroAcceso" ADD COLUMN "ubicacion" TEXT;
