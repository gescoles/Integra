// Conexión con Microsoft Graph usando "permisos de aplicación" (no de un
// usuario concreto): un administrador de Microsoft 365 del centro autoriza
// la app UNA vez, y a partir de ahí Docentium puede crear eventos en el
// calendario de CUALQUIER profesor del centro, usando su email (el mismo
// con el que inicia sesión en Docentium) — sin que cada profesor tenga que
// autorizar nada por su cuenta.

// Conexión con Microsoft Graph usando "permisos de aplicación" (no de un
// usuario concreto): un administrador de Microsoft 365 del centro autoriza
// la app UNA vez, y a partir de ahí Docentium puede crear eventos en el
// calendario de CUALQUIER profesor del centro, usando su email (el mismo
// con el que inicia sesión en Docentium) — sin que cada profesor tenga que
// autorizar nada por su cuenta.
//
// Usa la MISMA app de Azure que ya tenéis registrada para el login (las
// variables AZURE_AD_*) — no hace falta duplicar credenciales con otro
// nombre. Eso sí, esta parte necesita que, además, un administrador de
// Microsoft 365 le dé a esa misma app el permiso de APLICACIÓN
// "Calendars.ReadWrite" (con su consentimiento de administrador) en el
// Azure Portal — el login por sí solo no da ese permiso, hace falta
// añadirlo aparte sobre la misma app.

export async function getGraphToken() {
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Faltan las variables de entorno de Microsoft (AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET) — son las mismas que ya usa el login con Teams."
    );
  }

  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`No se pudo obtener el token de Microsoft: ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

/**
 * Crea un evento en el calendario de Outlook/Teams de un profesor.
 * `userEmail` debe ser su correo de Microsoft 365 (el mismo con el que
 * inicia sesión en Docentium).
 */
export async function createTeamsCalendarEvent(params: {
  userEmail: string;
  subject: string;
  bodyHtml: string;
  start: Date;
  end: Date;
  location?: string;
}) {
  const token = await getGraphToken();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(params.userEmail)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: params.subject,
        body: { contentType: "HTML", content: params.bodyHtml },
        start: { dateTime: params.start.toISOString(), timeZone: "Europe/Madrid" },
        end: { dateTime: params.end.toISOString(), timeZone: "Europe/Madrid" },
        location: params.location ? { displayName: params.location } : undefined,
        isReminderOn: true,
        reminderMinutesBeforeStart: 30,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`No se pudo crear el evento en el calendario de ${params.userEmail}: ${text}`);
  }

  return res.json() as Promise<{ id: string }>;
}

/**
 * Borra un evento del calendario de Outlook/Teams de un profesor, dado
 * el id que devolvió createTeamsCalendarEvent() al crearlo — se usa al
 * cancelar o editar una guardia/cobertura, para que no se quede un
 * evento huérfano en su calendario. Si el evento ya no existe (404,
 * por ejemplo porque el profesor ya lo borró él mismo a mano), no se
 * considera un error: el resultado que se buscaba (que no esté) ya se
 * cumple igual.
 */
export async function deleteTeamsCalendarEvent(userEmail: string, eventId: string) {
  const token = await getGraphToken();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`No se pudo eliminar el evento del calendario de ${userEmail}: ${text}`);
  }
}

/**
 * Antes de intentar tocar el calendario de Teams de alguien, comprobamos
 * si esa persona ha iniciado sesión con Microsoft/Teams alguna vez (lo
 * dejó registrado el propio login, en RegistroAcceso). Si nunca lo ha
 * hecho, no tiene sentido intentar crear un evento en un buzón que
 * probablemente ni siquiera existe — y sobre todo, no queremos mostrarle
 * a quien esté asignando la guardia/salida un error de Teams sobre un
 * profesor que ni usa Teams. Si SÍ lo ha usado alguna vez pero ahora
 * Teams está caído, el fallo se sigue tragando en cada punto de llamada
 * (nunca se le muestra al usuario) — eso ya lo gestiona el SuperAdmin
 * aparte, generando una contraseña si hace falta.
 */
export async function emailHaIniciadoConTeams(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const { prisma } = await import("@/lib/prisma");
  const registro = await prisma.registroAcceso.findFirst({
    where: { email: email.toLowerCase(), metodo: "microsoft" },
    select: { id: true },
  });
  return Boolean(registro);
}
