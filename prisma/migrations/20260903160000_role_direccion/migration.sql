-- AlterEnum: nuevo rol "DIRECCION" — por encima del resto del equipo
-- directivo, único (junto a SuperAdmin) que puede aprobar salidas,
-- validar material y gestionar guardias.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DIRECCION';
