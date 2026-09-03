-- AlterEnum: nuevo estado "ARCHIVADO" para centros — sus usuarios no
-- pueden iniciar sesión mientras el centro esté en este estado.
ALTER TYPE "SchoolStatus" ADD VALUE IF NOT EXISTS 'ARCHIVADO';
