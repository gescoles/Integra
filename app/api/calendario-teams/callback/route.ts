import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function paginaHTML(titulo: string, mensaje: string, ok: boolean) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" /><title>${titulo}</title>
<style>
  body { font-family: Arial, sans-serif; background:#F8FAFC; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
  .card { background:#fff; border-radius:16px; padding:32px; max-width:380px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
  h1 { font-size:18px; color:#0B1D4D; margin:0 0 8px; }
  p { color:#64748B; font-size:14px; }
  .icon { font-size:40px; margin-bottom:12px; }
</style>
</head><body>
  <div class="card">
    <div class="icon">${ok ? "✅" : "⚠️"}</div>
    <h1>${titulo}</h1>
    <p>${mensaje}</p>
  </div>
</body></html>`;
}

function responderHTML(titulo: string, mensaje: string, ok: boolean, status = 200) {
  return new NextResponse(paginaHTML(titulo, mensaje, ok), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const errorMicrosoft = searchParams.get("error_description");

  if (errorMicrosoft) {
    // Es normal que esto pase si el profesor le da a "Cancelar" en la
    // pantalla de permiso de Microsoft — no es un fallo de la app.
    return responderHTML("No se ha añadido al calendario", "Has cancelado el permiso en Microsoft, así que no se ha podido añadir la guardia a tu calendario de Teams.", false);
  }

  if (!code || !stateRaw || !stateRaw.includes(":")) {
    return responderHTML("Enlace no válido", "Este enlace de calendario no es correcto o ha caducado.", false, 400);
  }
  const [tipo, registroId] = stateRaw.split(":");
  if (tipo !== "guardia" && tipo !== "cobertura") {
    return responderHTML("Enlace no válido", "Este enlace de calendario no es correcto o ha caducado.", false, 400);
  }

  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    return responderHTML("No disponible", "Esta función todavía no está configurada. Contacta con el administrador.", false, 503);
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendario-teams/callback`;

  try {
    // 1. Cambiamos el "code" que ha dado Microsoft por un token de acceso
    // real, con permiso ya concedido por el profesor para escribir en SU
    // calendario (nada más, nada de otros calendarios).
    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        scope: "openid profile email Calendars.ReadWrite",
      }),
    });

    if (!tokenRes.ok) {
      return responderHTML("No se ha podido añadir", "Microsoft no ha aceptado el permiso. Inténtalo de nuevo desde el correo.", false, 502);
    }
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token as string;

    // 2. Buscamos los datos reales en Docentium — de una guardia directa
    // o de una cobertura de ausencia, según el tipo.
    let titulo: string;
    let descripcion: string;
    let inicio: Date;
    let fin: Date;
    let ubicacion: string | null;

    if (tipo === "cobertura") {
      const cobertura = await prisma.coberturaGuardia.findUnique({
        where: { id: registroId },
        include: { profesorAusente: { select: { name: true, email: true } } },
      });
      if (!cobertura) {
        return responderHTML("Guardia no encontrada", "Esta guardia ya no existe (puede que se haya eliminado o cancelado).", false, 404);
      }
      const [hIni, mIni] = cobertura.horaInicio.split(":").map(Number);
      const [hFin, mFin] = cobertura.horaFin.split(":").map(Number);
      inicio = new Date(cobertura.fecha);
      inicio.setHours(hIni, mIni, 0, 0);
      fin = new Date(cobertura.fecha);
      fin.setHours(hFin, mFin, 0, 0);
      const ausenteNombre = cobertura.profesorAusente.name ?? cobertura.profesorAusente.email;
      titulo = `Guardia: cubrir a ${ausenteNombre}`;
      descripcion = [
        cobertura.asignatura ? `Asignatura: ${cobertura.asignatura}` : null,
        cobertura.grupo ? `Grupo: ${cobertura.grupo}` : null,
      ]
        .filter(Boolean)
        .join(" — ");
      ubicacion = cobertura.ubicacion;
    } else {
      const guardia = await prisma.guardia.findUnique({ where: { id: registroId } });
      if (!guardia) {
        return responderHTML("Guardia no encontrada", "Esta guardia ya no existe (puede que se haya eliminado o cancelado).", false, 404);
      }
      inicio = new Date(guardia.fecha);
      fin = new Date(guardia.fecha);
      fin.setMinutes(fin.getMinutes() + 55); // misma duración por defecto que al crearla
      titulo = `Guardia${guardia.grupo ? `: ${guardia.grupo}` : ""}`;
      descripcion = [
        guardia.grupo ? `Grupo: ${guardia.grupo}` : null,
        guardia.tarea ? `Qué tienen que hacer los alumnos: ${guardia.tarea}` : null,
      ]
        .filter(Boolean)
        .join(" — ");
      ubicacion = guardia.ubicacion;
    }

    // 3. Con el permiso ya en la mano, creamos el evento en el calendario
    // del PROPIO profesor que ha hecho clic (no en el de otra persona).
    const eventoRes = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: titulo,
        body: { contentType: "text", content: descripcion },
        start: { dateTime: inicio.toISOString(), timeZone: "Europe/Madrid" },
        end: { dateTime: fin.toISOString(), timeZone: "Europe/Madrid" },
        location: ubicacion ? { displayName: ubicacion } : undefined,
      }),
    });

    if (!eventoRes.ok) {
      return responderHTML("No se ha podido añadir", "Se ha concedido el permiso, pero Microsoft no ha dejado crear el evento. Inténtalo de nuevo.", false, 502);
    }

    return responderHTML("¡Guardia añadida!", "Ya la tienes en tu calendario de Teams/Outlook. Puedes cerrar esta pestaña.", true);
  } catch (e) {
    console.error("Error añadiendo la guardia al calendario de Teams:", e);
    return responderHTML("Ha ocurrido un error", "No se ha podido añadir la guardia al calendario. Inténtalo de nuevo desde el correo.", false, 500);
  }
}
