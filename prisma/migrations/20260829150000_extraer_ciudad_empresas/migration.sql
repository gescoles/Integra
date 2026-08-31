-- Rellena "ciudad" a partir del texto de "direccion" ya guardado, para las
-- empresas importadas del Excel (que solo traían la dirección completa en
-- un único texto libre, sin ciudad separada). Patrón habitual en los datos:
-- "... 08301 Mataró" (código postal de 5 dígitos seguido de la ciudad).
UPDATE "Empresa"
SET "ciudad" = trim(regexp_replace(substring("direccion" from '\d{5}\s+(.*)$'), '\s+$', ''))
WHERE "ciudad" IS NULL
  AND "direccion" IS NOT NULL
  AND substring("direccion" from '\d{5}\s+(.*)$') IS NOT NULL
  AND length(trim(substring("direccion" from '\d{5}\s+(.*)$'))) > 0;
