-- Guarda el id del evento del calendario de Teams para poder borrarlo al
-- cancelar/editar una guardia o cobertura — antes se creaba el evento
-- pero nunca se guardaba su id, así que no había forma de eliminarlo.
ALTER TABLE "Guardia" ADD COLUMN "teamsEventId" TEXT;
ALTER TABLE "CoberturaGuardia" ADD COLUMN "teamsEventId" TEXT;
