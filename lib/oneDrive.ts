// Sube archivos al OneDrive de una cuenta concreta de Microsoft 365 del
// centro, usando "permisos de aplicación" (no de un usuario) — la MISMA
// app de Azure que ya tenéis registrada para el login con Teams (las
// variables AZURE_AD_*), sin duplicar credenciales.
//
// Hace falta, además, que un administrador de Microsoft 365 le dé a esa
// misma app el permiso de APLICACIÓN "Files.ReadWrite.All" (con su
// consentimiento de administrador) en el Azure Portal — el login y el
// permiso de calendario no dan esto, hay que añadirlo aparte sobre la
// misma app.
//
// Nota: esto sube archivos con la API "simple" de Graph, con un límite
// de 4 MB por archivo — de sobra para los backups en JSON/SQL de un
// centro, pero si algún día un backup superara ese tamaño, habría que
// pasar a subida por partes ("upload session").

import { getGraphToken } from "./microsoftGraph";

async function graphFetch(url: string, init: RequestInit) {
  const token = await getGraphToken();
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    const pistaAprovisionamiento = text.includes("spException") || text.includes("generalException")
      ? " — si esto sigue saliendo después de comprobar que la cuenta ya ha entrado en OneDrive alguna vez, puede que también haga falta que un administrador de Microsoft 365 confirme que esa cuenta tiene licencia de OneDrive/SharePoint activa (sin licencia, tampoco se puede crear su Drive)."
      : "";
    throw new Error(`Graph respondió ${res.status}: ${text}${pistaAprovisionamiento}`);
  }
  return res;
}

/**
 * Crea (o reutiliza si ya existe) una subcarpeta dentro de otra carpeta
 * de OneDrive, y devuelve su id. Va paso a paso, en vez de confiar en
 * que Graph cree carpetas intermedias solo a partir de una ruta larga
 * de golpe — es más lento pero mucho más fiable, y evita errores
 * genéricos que a veces da el método de "ruta completa en un PUT".
 */
async function ensureOneDriveFolder(userEmail: string, parentItemPath: string, name: string): Promise<string> {
  const base = parentItemPath
    ? `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/drive/root:/${parentItemPath}:/children`
    : `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/drive/root/children`;

  const res = await graphFetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      folder: {},
      "@microsoft.graph.conflictBehavior": "replace", // si ya existe una carpeta con ese nombre, la reutiliza en vez de fallar
    }),
  });
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Sube (o sobrescribe) un archivo en el OneDrive de `userEmail`, en la
 * ruta indicada (separada por "/") — las carpetas intermedias que no
 * existan se crean solas, paso a paso.
 */
export async function uploadFileToOneDrive(userEmail: string, path: string, buffer: Buffer, contentType: string) {
  const partes = path.split("/").filter(Boolean);
  const nombreArchivo = partes.pop();
  if (!nombreArchivo) throw new Error("Falta el nombre del archivo a subir a OneDrive.");

  // Crea cada carpeta del camino, una a una, reutilizando las que ya
  // existan.
  let rutaAcumulada = "";
  for (const carpeta of partes) {
    await ensureOneDriveFolder(userEmail, rutaAcumulada, carpeta);
    rutaAcumulada = rutaAcumulada ? `${rutaAcumulada}/${encodeURIComponent(carpeta)}` : encodeURIComponent(carpeta);
  }

  const rutaCompleta = rutaAcumulada ? `${rutaAcumulada}/${encodeURIComponent(nombreArchivo)}` : encodeURIComponent(nombreArchivo);
  await graphFetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/drive/root:/${rutaCompleta}:/content`,
    {
      method: "PUT",
      headers: { "Content-Type": contentType },
      // TypeScript no reconoce un Buffer de Node como BodyInit válido de
      // fetch en modo estricto — Uint8Array sí lo es, y un Buffer ya ES
      // una Uint8Array por debajo, así que esto no cambia los bytes que
      // se envían, solo satisface el tipo.
      body: new Uint8Array(buffer),
    }
  );
}
