// Descripción ligera del dispositivo/ubicación de un login, a partir de
// las cabeceras de la petición — sin ninguna librería externa de parseo
// de user-agent ni llamadas a APIs de terceros (Vercel ya manda la
// geolocalización aproximada por IP en sus propias cabeceras).

function primerValor(valor: string | string[] | undefined | null): string | null {
  if (!valor) return null;
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v?.split(",")[0]?.trim() || null;
}

export function obtenerIp(headers: Record<string, any> | undefined): string | null {
  if (!headers) return null;
  return primerValor(headers["x-forwarded-for"]) ?? primerValor(headers["x-real-ip"]) ?? null;
}

export function obtenerUbicacion(headers: Record<string, any> | undefined): string | null {
  if (!headers) return null;
  const ciudad = primerValor(headers["x-vercel-ip-city"]);
  const pais = primerValor(headers["x-vercel-ip-country"]);
  // Vercel manda la ciudad como URI-encoded (espacios, acentos...).
  const ciudadLegible = ciudad ? decodeURIComponent(ciudad) : null;
  if (ciudadLegible && pais) return `${ciudadLegible}, ${pais}`;
  return ciudadLegible ?? pais ?? null;
}

// Descripción corta tipo "iPhone · Safari" / "Windows · Chrome" a partir
// del User-Agent — deliberadamente burda (solo SO + navegador, sin
// versiones) para que no cambie en cada actualización del navegador y no
// dispare avisos de "dispositivo nuevo" a cada rato.
export function parseDispositivo(userAgent: string | undefined | null): string {
  const ua = userAgent ?? "";

  let so = "Dispositivo desconocido";
  if (/iPhone/i.test(ua)) so = "iPhone";
  else if (/iPad/i.test(ua)) so = "iPad";
  else if (/Android/i.test(ua)) so = /Mobile/i.test(ua) ? "Android (móvil)" : "Android (tablet)";
  else if (/Macintosh|Mac OS X/i.test(ua)) so = "Mac";
  else if (/Windows/i.test(ua)) so = "Windows";
  else if (/Linux/i.test(ua)) so = "Linux";

  let navegador = "";
  if (/EdgA|Edg\//i.test(ua)) navegador = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) navegador = "Opera";
  else if (/CriOS|Chrome\//i.test(ua)) navegador = "Chrome";
  else if (/FxiOS|Firefox\//i.test(ua)) navegador = "Firefox";
  else if (/Safari\//i.test(ua)) navegador = "Safari";

  return navegador ? `${so} · ${navegador}` : so;
}
