"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generarCopiaSeguridad, generarCopiaSeguridadPorCentro, generarCopiaSeguridadSQLPorCentro, restaurarCopiaSeguridad, restaurarCopiaSeguridadPorCentro, carpetasBackupBBDD, type CopiaSeguridad } from "@/lib/backup";
import { ensureSubfolder, uploadGenericFileToDrive, listFilesInFolder, downloadFileFromDrive } from "@/lib/googleDrive";
import { ejecutarBackupExcelModulos } from "@/lib/backupExcel";
import { safeFileName } from "@/lib/exportWorkbooks";
import { prisma } from "@/lib/prisma";
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

// Botón "Backup BBDD instantáneo" del panel: guarda una copia completa de
// TODA la base de datos (es una única base compartida entre centros, así
// que el archivo en sí siempre lleva todo — no hay forma real de sacar
// "solo los datos de un centro" en un backup de verdad), pero el archivo
// se guarda dentro de la carpeta de Drive del centro que el SuperAdmin
// tenía elegido al pulsar el botón, en su propia subcarpeta "Backup BBDD".
export async function crearBackupBaseDatosInstantaneo(schoolId: string) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede generar copias de seguridad.");

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  if (!school) throw new Error("No se ha encontrado el centro.");

  const rootFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!rootFolderId) throw new Error("Falta configurar la carpeta raíz de Google Drive (GOOGLE_DRIVE_BACKUP_FOLDER_ID).");

  // A diferencia de la copia general (crearCopiaSeguridad, que sí lleva
  // todos los centros mezclados), esta va filtrada de verdad: solo lo que
  // pertenece a este centro concreto. Se guardan dos versiones: el .json
  // (por si algún día quieres restaurarlo desde dentro de la app) y el
  // .sql (para poder pegarlo y ejecutarlo directamente en Supabase, sin
  // pasar por la app para nada).
  const copia = await generarCopiaSeguridadPorCentro(schoolId);
  const jsonBuffer = Buffer.from(JSON.stringify(copia), "utf-8");
  const sqlTexto = await generarCopiaSeguridadSQLPorCentro(schoolId);
  const sqlBuffer = Buffer.from(sqlTexto, "utf-8");

  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const hora = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }).format(new Date()).replace(":", "");
  const nombreJson = `backup-bbdd-manual-${fecha}-${hora}.json`;
  const nombreSql = `backup-bbdd-manual-${fecha}-${hora}.sql`;

  const { jsonFolderId, sqlFolderId } = await carpetasBackupBBDD(rootFolderId, safeFileName(school.name));
  await uploadGenericFileToDrive(jsonFolderId, nombreJson, jsonBuffer, "application/json");
  await uploadGenericFileToDrive(sqlFolderId, nombreSql, sqlBuffer, "text/plain");

  revalidatePath("/dashboard/backup");
  return { nombre: nombreSql, generadaEn: copia.generadaEn };
}

// Lista los backups de UN centro concreto (el .json de cada uno), para
// poder elegir cuál restaurar sin afectar a los demás centros.
export async function listarBackupsCentro(schoolId: string) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) return [];

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  if (!school) return [];

  const rootFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!rootFolderId) return [];

  const schoolFolderId = await ensureSubfolder(rootFolderId, safeFileName(school.name));
  const jsonFolderId = await ensureSubfolder(schoolFolderId, "Backup BBDD JSON");
  const archivos = await listFilesInFolder(jsonFolderId);

  return archivos
    .filter((f) => f.name?.endsWith(".json"))
    .map((f) => ({
      id: f.id!,
      nombre: f.name ?? "backup.json",
      fecha: f.createdTime ?? null,
      tamanoKB: f.size ? Math.round(Number(f.size) / 1024) : null,
    }));
}

// Restaura los datos de un centro a partir de uno de esos .json — solo
// borra y repone lo de ESE centro, nunca toca los demás. Por seguridad,
// antes de restaurar se guarda una copia del estado actual de ese mismo
// centro, por si hiciera falta deshacerlo.
export async function restaurarBackupCentro(schoolId: string, fileId: string) {
  const session = await getServerSession(authOptions);
  if (!esSuperAdmin(session?.user.role)) throw new Error("Solo el SuperAdmin puede restaurar una copia de seguridad.");

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  if (!school) throw new Error("No se ha encontrado el centro.");

  const { bytes } = await downloadFileFromDrive(fileId);
  let copia: CopiaSeguridad;
  try {
    copia = JSON.parse(bytes.toString("utf-8"));
  } catch {
    throw new Error("El archivo no es un backup válido.");
  }

  // Copia de seguridad del estado actual de este centro, justo antes de
  // restaurar, por si hiciera falta deshacerlo — en los dos formatos: el
  // .json (que ya sabe usar el propio botón de "Restaurar" de aquí
  // arriba) y el .sql (por si prefieres ejecutarlo tú mismo en Supabase,
  // sin depender para nada de la app).
  const rootFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (rootFolderId) {
    const copiaActual = await generarCopiaSeguridadPorCentro(schoolId);
    const sqlActual = await generarCopiaSeguridadSQLPorCentro(schoolId);
    const { jsonFolderId, sqlFolderId } = await carpetasBackupBBDD(rootFolderId, safeFileName(school.name));
    const marcaTiempo = new Date().toISOString().replace(/[:.]/g, "-");
    await uploadGenericFileToDrive(jsonFolderId, `antes-de-restaurar-${marcaTiempo}.json`, Buffer.from(JSON.stringify(copiaActual), "utf-8"), "application/json");
    await uploadGenericFileToDrive(sqlFolderId, `antes-de-restaurar-${marcaTiempo}.sql`, Buffer.from(sqlActual, "utf-8"), "text/plain");
  }

  await restaurarCopiaSeguridadPorCentro(schoolId, copia);

  revalidatePath("/", "layout");
}
