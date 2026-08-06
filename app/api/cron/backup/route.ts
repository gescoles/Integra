import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTutoriasWorkbook, buildMaterialWorkbook, buildSalidasWorkbook, buildPracticasWorkbook, safeFileName } from "@/lib/exportWorkbooks";
import { ensureSubfolder, uploadXlsxToDrive } from "@/lib/googleDrive";

export const maxDuration = 300; // 5 minutos: puede haber muchos centros que respaldar

export async function GET(req: NextRequest) {
  // Vercel añade automáticamente esta cabecera en las peticiones de Cron
  // Jobs cuando hay una variable de entorno CRON_SECRET configurada. Así
  // nadie más puede disparar el backup solo con adivinar la URL.
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;
  if (!rootFolderId) {
    return NextResponse.json(
      { error: "Falta GOOGLE_DRIVE_BACKUP_FOLDER_ID en las variables de entorno." },
      { status: 500 }
    );
  }

  // Usamos la fecha de España (no la de UTC), para que la carpeta del día
  // no se quede "un día atrás" durante la madrugada por la diferencia horaria.
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, modules: true },
  });

  const resultados: { centro: string; ok: boolean; error?: string }[] = [];

  for (const school of schools) {
    try {
      const schoolFolderId = await ensureSubfolder(rootFolderId, safeFileName(school.name));

      if (school.modules.includes("tutorias")) {
        const tutoriasFolderId = await ensureSubfolder(schoolFolderId, "Tutorias");
        const dateFolderId = await ensureSubfolder(tutoriasFolderId, fecha);
        const { workbook } = await buildTutoriasWorkbook(school.id);
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        await uploadXlsxToDrive(dateFolderId, `Tutorias_${fecha}.xlsx`, buffer);
      }

      if (school.modules.includes("material")) {
        const materialFolderId = await ensureSubfolder(schoolFolderId, "Material");
        const dateFolderId = await ensureSubfolder(materialFolderId, fecha);
        const { workbook } = await buildMaterialWorkbook(school.id);
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        await uploadXlsxToDrive(dateFolderId, `Material_${fecha}.xlsx`, buffer);
      }

      if (school.modules.includes("salidas")) {
        const salidasFolderId = await ensureSubfolder(schoolFolderId, "Salidas");
        const dateFolderId = await ensureSubfolder(salidasFolderId, fecha);
        const { workbook } = await buildSalidasWorkbook(school.id);
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        await uploadXlsxToDrive(dateFolderId, `Salidas_${fecha}.xlsx`, buffer);
      }

      if (school.modules.includes("practicas")) {
        const practicasFolderId = await ensureSubfolder(schoolFolderId, "Practicas");
        const dateFolderId = await ensureSubfolder(practicasFolderId, fecha);
        const { workbook } = await buildPracticasWorkbook(school.id);
        const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
        await uploadXlsxToDrive(dateFolderId, `Practicas_${fecha}.xlsx`, buffer);
      }

      resultados.push({ centro: school.name, ok: true });
    } catch (e) {
      // Si falla un centro (por ejemplo, Drive da un error puntual), seguimos
      // con el resto en vez de abortar todo el backup nocturno.
      resultados.push({
        centro: school.name,
        ok: false,
        error: e instanceof Error ? e.message : "Error desconocido",
      });
    }
  }

  return NextResponse.json({ fecha, resultados });
}
