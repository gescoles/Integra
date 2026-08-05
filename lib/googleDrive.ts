import { google } from "googleapis";
import { Readable } from "stream";

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
 * Busca una subcarpeta por nombre dentro de otra carpeta de Drive; si no
 * existe, la crea. Así cada día se agrupan los backups en su propia carpeta
 * con la fecha, dentro de la carpeta principal que compartiste con la
 * cuenta de servicio.
 */
export async function ensureSubfolder(parentFolderId: string, name: string) {
  const drive = getDriveClient();

  const escaped = name.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
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
      parents: [parentFolderId],
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
