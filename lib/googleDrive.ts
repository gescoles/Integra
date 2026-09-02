import { google } from "googleapis";
import { Readable } from "stream";

// Si alguien pega el enlace completo de una carpeta de Drive (en vez del
// id a secas) en cualquier campo de configuración, esto lo reconoce y
// extrae el id solo — así no hace falta que nadie sepa distinguir un id
// de un enlace. Si lo que llega ya es un id normal, se devuelve tal cual.
export function extraerIdCarpetaDrive(valor: string): string {
  const limpio = valor.trim();
  const patrones = [
    /\/folders\/([a-zA-Z0-9_-]+)/, // https://drive.google.com/drive/folders/ID  (con o sin /u/0/ en medio)
    /[?&]id=([a-zA-Z0-9_-]+)/, // https://drive.google.com/open?id=ID
  ];
  for (const patron of patrones) {
    const coincidencia = limpio.match(patron);
    if (coincidencia) return coincidencia[1];
  }
  return limpio;
}

function getAuth() {
  // Con una cuenta de Google normal (no Workspace), las "cuentas de
  // servicio" no pueden guardar archivos en el Drive de nadie porque no
  // tienen almacenamiento propio. Por eso aquí nos autenticamos como TÚ
  // mismo (tu propia cuenta de Google), usando un token de acceso
  // permanente que se genera una sola vez desde /api/google-oauth/start.
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Faltan las variables de entorno de Google Drive: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN. Sigue los pasos de /api/google-oauth/start para conseguir el refresh token."
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

function getDriveClient() {
  return google.drive({ version: "v3", auth: getAuth() });
}

/**
 * Descarga un archivo de Drive del lado del servidor (autenticado con
 * nuestra propia cuenta), para poder servirlo nosotros mismos desde una
 * ruta API en vez de pedirle al navegador que lo cargue directamente
 * desde Drive. Las URLs públicas de Drive (uc?export=view, thumbnail...)
 * no son fiables para incrustarlas en <img>: a veces Google las bloquea o
 * devuelve una página HTML en vez del archivo. Así nos aseguramos de que
 * siempre funciona, sin depender de eso.
 */
export async function downloadFileFromDrive(fileId: string) {
  const drive = getDriveClient();

  const meta = await drive.files.get({ fileId, fields: "mimeType, name" });
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  return {
    mimeType: meta.data.mimeType || "application/octet-stream",
    bytes: Buffer.from(res.data as ArrayBuffer),
  };
}

/**
 * Lista los archivos de una carpeta de Drive, más recientes primero. Se
 * usa para mostrar las copias de seguridad disponibles, ordenadas por
 * fecha de creación.
 */
export async function listFilesInFolder(folderId: string) {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, createdTime, size)",
    orderBy: "createdTime desc",
    spaces: "drive",
  });
  return res.data.files ?? [];
}

/**
 * Busca una subcarpeta por nombre dentro de otra carpeta de Drive; si no
 * existe, la crea. Así cada día se agrupan los backups en su propia carpeta
 * con la fecha, dentro de la carpeta principal que compartiste con la
 * cuenta de servicio.
 */
export async function ensureSubfolder(parentFolderId: string, name: string) {
  const drive = getDriveClient();
  const parentIdReal = extraerIdCarpetaDrive(parentFolderId);

  const escaped = name.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${parentIdReal}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0 && res.data.files[0].id) {
    return res.data.files[0].id;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentIdReal],
    },
    fields: "id",
  });

  if (!created.data.id) throw new Error("No se pudo crear la carpeta en Drive.");
  return created.data.id;
}

/**
 * Sube (o sobrescribe si ya existe un archivo con el mismo nombre en esa
 * carpeta) un buffer de Excel a Google Drive.
 */
export async function uploadXlsxToDrive(folderId: string, filename: string, buffer: Buffer) {
  const drive = getDriveClient();
  const mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const existing = await drive.files.list({
    q: `'${folderId}' in parents and name = '${filename.replace(/'/g, "\\'")}' and trashed = false`,
    fields: "files(id)",
    spaces: "drive",
  });

  const media = { mimeType, body: Readable.from(buffer) };

  if (existing.data.files && existing.data.files.length > 0 && existing.data.files[0].id) {
    await drive.files.update({ fileId: existing.data.files[0].id, media });
    return;
  }

  await drive.files.create({
    requestBody: { name: filename, parents: [folderId], mimeType },
    media,
  });
}

/**
 * Igual que uploadXlsxToDrive, pero para PDFs (usado por los expedientes
 * sancionadores). Si ya existe un archivo con el mismo nombre en esa
 * carpeta, lo sobrescribe en vez de duplicarlo.
 */
export async function uploadPdfToDrive(folderId: string, filename: string, buffer: Buffer) {
  const drive = getDriveClient();
  const mimeType = "application/pdf";

  const existing = await drive.files.list({
    q: `'${folderId}' in parents and name = '${filename.replace(/'/g, "\\'")}' and trashed = false`,
    fields: "files(id)",
    spaces: "drive",
  });

  const media = { mimeType, body: Readable.from(buffer) };

  if (existing.data.files && existing.data.files.length > 0 && existing.data.files[0].id) {
    await drive.files.update({ fileId: existing.data.files[0].id, media });
    return;
  }

  await drive.files.create({
    requestBody: { name: filename, parents: [folderId], mimeType },
    media,
  });
}

/**
 * Sube cualquier tipo de archivo a Drive (usado por OnBoarding), aceptando
 * el mimeType que haga falta en cada caso.
 */
export async function uploadGenericFileToDrive(folderId: string, filename: string, buffer: Buffer, mimeType: string, description?: string) {
  const drive = getDriveClient();

  const existing = await drive.files.list({
    q: `'${folderId}' in parents and name = '${filename.replace(/'/g, "\\'")}' and trashed = false`,
    fields: "files(id)",
    spaces: "drive",
  });

  const media = { mimeType, body: Readable.from(buffer) };

  if (existing.data.files && existing.data.files.length > 0 && existing.data.files[0].id) {
    await drive.files.update({ fileId: existing.data.files[0].id, media, requestBody: { description } });
    return;
  }

  await drive.files.create({
    requestBody: { name: filename, parents: [folderId], mimeType, description },
    media,
  });
}

/**
 * Igual que uploadGenericFileToDrive, pero además hace el archivo público
 * ("cualquiera con el enlace puede verlo") y devuelve una URL que se puede
 * usar directamente en una etiqueta <img>. Pensado para contenido que hay
 * que mostrar dentro de la app (como las fotos de Historias), no solo para
 * copias de seguridad.
 */
export async function uploadPublicImageToDrive(
  folderId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
  description?: string
) {
  const drive = getDriveClient();

  const existing = await drive.files.list({
    q: `'${folderId}' in parents and name = '${filename.replace(/'/g, "\\'")}' and trashed = false`,
    fields: "files(id)",
    spaces: "drive",
  });

  const media = { mimeType, body: Readable.from(buffer) };
  let fileId: string | null | undefined;

  if (existing.data.files && existing.data.files.length > 0 && existing.data.files[0].id) {
    fileId = existing.data.files[0].id;
    await drive.files.update({ fileId, media, requestBody: { description } });
  } else {
    const created = await drive.files.create({
      requestBody: { name: filename, parents: [folderId], mimeType, description },
      media,
      fields: "id",
    });
    fileId = created.data.id;
  }

  if (!fileId) throw new Error("No se pudo obtener el identificador del archivo subido a Drive.");

  // Lo hacemos público como respaldo (por si se quiere abrir directamente
  // en Drive desde fuera de la app), aunque para mostrarlo dentro de
  // Docentium usamos nuestra propia ruta /api/drive-image, que es fiable de
  // verdad porque no depende de las URLs públicas de Drive.
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return `/api/drive-image/${fileId}`;
}
