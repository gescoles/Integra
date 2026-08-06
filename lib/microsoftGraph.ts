// Conexión con Microsoft Graph usando "permisos de aplicación" (no de un
// usuario concreto): un administrador de Microsoft 365 del centro autoriza
// la app UNA vez, y a partir de ahí Integra puede crear eventos en el
// calendario de CUALQUIER profesor del centro, usando su email (el mismo
// con el que inicia sesión en Integra) — sin que cada profesor tenga que
// autorizar nada por su cuenta.

async function getGraphToken() {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Faltan las variables de entorno de Microsoft 365 (MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET)."
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
 * inicia sesión en Integra).
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

  return res.json();
}
