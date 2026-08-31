-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN "contactoEmailsExtra" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Repara correos que quedaron pegados sin separador al importar (p. ej.
-- "jespi@2ionline.comadministracion@2ionline.com" = dos correos en uno).
-- Detecta el patrón "correo.tld" seguido inmediatamente de otro correo, y
-- separa el segundo a contactoEmailsExtra.
DO $$
DECLARE
  fila RECORD;
  partido TEXT[];
BEGIN
  FOR fila IN
    SELECT id, "contactoEmail"
    FROM "Empresa"
    WHERE "contactoEmail" ~ '^[^@\s]+@[^@\s.]+\.[a-z]{2,}[a-zA-Z][^@\s]*@[^@\s]+\.[a-z]{2,}$'
  LOOP
    partido := regexp_match(fila."contactoEmail", '^([^@\s]+@[^@\s.]+\.[a-z]{2,})([a-zA-Z][^@\s]*@[^@\s]+\.[a-z]{2,})$');
    IF partido IS NOT NULL THEN
      UPDATE "Empresa"
      SET "contactoEmail" = partido[1],
          "contactoEmailsExtra" = array_append("contactoEmailsExtra", partido[2])
      WHERE id = fila.id;
    END IF;
  END LOOP;
END $$;
