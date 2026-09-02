import { prisma } from "@/lib/prisma";
import { buildTutoriasWorkbook, buildMaterialWorkbook, buildSalidasWorkbook, buildPracticasWorkbook, buildCertificacionesWorkbookPorCentro, buildAbsentismoWorkbook, safeFileName } from "@/lib/exportWorkbooks";
import { ensureSubfolder, uploadXlsxToDrive } from "@/lib/googleDrive";
import { uploadFileToOneDrive } from "@/lib/oneDrive";

export type ResultadoBackupExcel = { centro: string; ok: boolean; error?: string };

// La copia "de verdad" en Excel: una carpeta por centro, una subcarpeta
// por módulo, y dentro una subcarpeta con la fecha de hoy — igual que
// hacía siempre el backup automático de cada noche. La usan tanto el cron
// nocturno como el botón manual del panel de Copia de Seguridad, para no
// tener la misma lógica escrita dos veces en sitios distintos.
//
// Igual que el backup de base de datos, cada centro puede tener su
// propia carpeta de Drive y su propio correo de OneDrive configurados
// desde SuperAdmin — si no los tiene, usa la carpeta general de Drive
// como respaldo y, sencillamente, no sube nada a OneDrive.
export async function ejecutarBackupExcelModulos(): Promise<{ fecha: string; resultados: ResultadoBackupExcel[] }> {
  const rootFolderIdGlobal = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

  // Usamos la fecha de España (no la de UTC), para que la carpeta del día
  // no se quede "un día atrás" durante la madrugada por la diferencia horaria.
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, modules: true, driveBackupFolderId: true, oneDriveBackupEmail: true },
  });

  const resultados: ResultadoBackupExcel[] = [];

  for (const school of schools) {
    try {
      const rootFolderId = school.driveBackupFolderId || rootFolderIdGlobal;
      const schoolFolderId = rootFolderId ? await ensureSubfolder(rootFolderId, safeFileName(school.name)) : null;

      // Sube un módulo a Drive (si hay carpeta configurada) y a OneDrive
      // (si el centro tiene correo configurado) — mejor esfuerzo: si
      // OneDrive falla, no tira abajo el resto del backup de este centro.
      const subirModulo = async (nombreModulo: string, nombreArchivo: string, buffer: Buffer) => {
        if (schoolFolderId) {
          const moduloFolderId = await ensureSubfolder(schoolFolderId, nombreModulo);
          const dateFolderId = await ensureSubfolder(moduloFolderId, fecha);
          await uploadXlsxToDrive(dateFolderId, nombreArchivo, buffer);
        }
        if (school.oneDriveBackupEmail) {
          try {
            await uploadFileToOneDrive(
              school.oneDriveBackupEmail,
              `Docentium_Backup/${safeFileName(school.name)}/${nombreModulo}/${fecha}/${nombreArchivo}`,
              buffer,
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
          } catch (e) {
            console.error(`No se pudo subir "${nombreModulo}" de "${school.name}" a OneDrive:`, e);
          }
        }
      };

      if (school.modules.includes("tutorias")) {
        const { workbook } = await buildTutoriasWorkbook(school.id);
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        await subirModulo("Tutorias", `Tutorias_${fecha}.xlsx`, buffer);
      }

      if (school.modules.includes("material")) {
        const { workbook } = await buildMaterialWorkbook(school.id);
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        await subirModulo("Material", `Material_${fecha}.xlsx`, buffer);
      }

      if (school.modules.includes("salidas")) {
        const { workbook } = await buildSalidasWorkbook(school.id);
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        await subirModulo("Salidas", `Salidas_${fecha}.xlsx`, buffer);
      }

      if (school.modules.includes("practicas")) {
        const { workbook } = await buildPracticasWorkbook(school.id);
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        await subirModulo("Practicas", `Practicas_${fecha}.xlsx`, buffer);
      }

      if (school.modules.includes("certificaciones")) {
        const workbook = await buildCertificacionesWorkbookPorCentro(school.id);
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        await subirModulo("Certificaciones", `Certificaciones_${fecha}.xlsx`, buffer);
      }

      if (school.modules.includes("guardias")) {
        const workbook = await buildAbsentismoWorkbook(school.id);
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        await subirModulo("Absentismo", `Absentismo_${fecha}.xlsx`, buffer);
      }

      resultados.push({ centro: school.name, ok: true });
    } catch (e) {
      // Si falla un centro (por ejemplo, Drive da un error puntual), seguimos
      // con el resto en vez de abortar todo el backup.
      resultados.push({
        centro: school.name,
        ok: false,
        error: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  }

  return { fecha, resultados };
}
