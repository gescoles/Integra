// Genera un archivo .ics (formato de calendario estándar, el mismo que
// entiende Outlook, Teams, Google Calendar y Apple Calendar) para una
// cobertura de guardia — es lo que hace que, al abrir el correo, aparezca
// solo el botón de "Agregar al calendario" en Outlook/Teams. No hace
// falta ningún permiso especial de Microsoft para esto, funciona con
// cualquier cuenta de correo.

function formatoFechaICS(fecha: Date, horaHHmm: string) {
  const [horas, minutos] = horaHHmm.split(":").map(Number);
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  const hh = String(horas).padStart(2, "0");
  const mm = String(minutos).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}00`;
}

function escaparTextoICS(texto: string) {
  return texto.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function generarICSCobertura(params: {
  id: string;
  ausenteNombre: string;
  asignatura: string | null;
  grupo: string | null;
  ubicacion: string | null;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
  // Si se pasa, sustituye el título por defecto ("Guardia: cubrir a
  // X") — para las guardias directas, que no tienen ausente al que
  // cubrir.
  titulo?: string;
}) {
  const inicio = formatoFechaICS(params.fecha, params.horaInicio);
  const fin = formatoFechaICS(params.fecha, params.horaFin);
  const ahora = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const titulo = params.titulo ?? `Guardia: cubrir a ${params.ausenteNombre}`;
  const descripcionPartes = [
    params.asignatura ? `Asignatura: ${params.asignatura}` : null,
    params.grupo ? `Grupo: ${params.grupo}` : null,
  ].filter(Boolean);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Docentium//Guardias//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:guardia-${params.id}@docentium.org`,
    `DTSTAMP:${ahora}`,
    `DTSTART;TZID=Europe/Madrid:${inicio}`,
    `DTEND;TZID=Europe/Madrid:${fin}`,
    `SUMMARY:${escaparTextoICS(titulo)}`,
    descripcionPartes.length > 0 ? `DESCRIPTION:${escaparTextoICS(descripcionPartes.join(" — "))}` : "",
    params.ubicacion ? `LOCATION:${escaparTextoICS(params.ubicacion)}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return ics;
}
