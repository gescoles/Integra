"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generarCopiaSeguridad, restaurarCopiaSeguridad, type CopiaSeguridad } from "@/lib/backup";
import { ensureSubfolder, uploadGenericFileToDrive, listFilesInFolder, downloadFileFromDrive } from "@/lib/googleDrive";
import { ejecutarBackupExcelModulos } from "@/lib/backupExcel";
import { revalidatePath } from "next/cache";

function esSuperAdmin(role?: string) {
  return role === "SUPERADMIN";
}

async function carpetaCopiasSeguridad() {
  const rootFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!rootFolderId) throw new Error("Falta configurar la carpeta raíz de Google Drive (GOOGLE_DRIVE_BACKUP_FOLDER_ID).");
  return ensureSubfolder(rootFolderId, "Copia de seguridad");
}

export async function crearCopiaSeguridad() {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede generar copias de seguridad.");

  const copia = await generarCopiaSeguridad();
  const json = JSON.stringify(copia, null, 0);
  const buffer = Buffer.from(json, "utf-8");

  const ahora = new Date();
  const nombre = `copia-${ahora.toISOString().replace(/[:.]/g, "-")}.json`;

  const folderId = await carpetaCopiasSeguridad();
  await uploadGenericFileToDrive(folderId, nombre, buffer, "application/json");

  revalidatePath("/dashboard/backup");
}

// El botón "Copia en Excel por módulos": lo mismo que hace el backup
// automático de cada noche, pero disparado a mano — una carpeta por
// centro, una subcarpeta por módulo, y dentro la fecha de hoy.
export async function crearCopiaExcelModulos() {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede generar copias de seguridad.");

  const { resultados } = await ejecutarBackupExcelModulos();

  const fallidos = resultados.filter((r) => !r.ok);
  if (fallidos.length > 0 && fallidos.length === resultados.length) {
    // Si TODOS los centros han fallado, es casi seguro un problema de
    // conexión con Drive — lo mostramos como error de verdad, no como aviso.
    throw new Error(fallidos[0].error ?? "No se pudo completar la copia en ningún centro.");
  }

  revalidatePath("/dashboard/backup");
  return resultados;
}

export async function listarCopiasSeguridad() {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) return [];

  const folderId = await carpetaCopiasSeguridad();
  const archivos = await listFilesInFolder(folderId);

  return archivos.map((f) => ({
    id: f.id!,
    nombre: f.name ?? "copia.json",
    fecha: f.createdTime ?? null,
    tamanoKB: f.size ? Math.round(Number(f.size) / 1024) : null,
  }));
}

export async function restaurarDesdeArchivo(fileId: string) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede restaurar una copia de seguridad.");

  const { bytes } = await downloadFileFromDrive(fileId);
  let copia: CopiaSeguridad;
  try {
    copia = JSON.parse(bytes.toString("utf-8"));
  } catch {
    throw new Error("El archivo de la copia de seguridad no es válido.");
  }
  if (!copia?.datos) throw new Error("El archivo de la copia de seguridad no tiene el formato esperado.");

  // Por seguridad, generamos automáticamente una copia del estado actual
  // justo antes de restaurar, por si hiciera falta deshacerlo.
  const copiaAntesDeRestaurar = await generarCopiaSeguridad();
  const folderId = await carpetaCopiasSeguridad();
  const nombreSeguridad = `antes-de-restaurar-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await uploadGenericFileToDrive(
    folderId,
    nombreSeguridad,
    Buffer.from(JSON.stringify(copiaAntesDeRestaurar), "utf-8"),
    "application/json"
  );

  await restaurarCopiaSeguridad(copia);

  revalidatePath("/", "layout");
}
