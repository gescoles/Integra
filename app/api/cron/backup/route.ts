import { NextRequest, NextResponse } from "next/server";
import { ejecutarBackupExcelModulos } from "@/lib/backupExcel";
import { ejecutarBackupBBDDTodosCentros } from "@/lib/backup";
import { actualizarEstadosCertificacionesPorFecha } from "@/lib/certificacionesAutoEstado";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300; // 5 minutos: puede haber muchos centros que respaldar

export async function GET(req: NextRequest) {
  // Vercel añade automáticamente esta cabecera en las peticiones de Cron
  // Jobs cuando hay una variable de entorno CRON_SECRET configurada. Así
  // nadie más puede disparar el backup solo con adivinar la URL.
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  const [excel, bbdd, , certificaciones] = await Promise.allSettled([
    ejecutarBackupExcelModulos(),
    ejecutarBackupBBDDTodosCentros(),
    // Limpieza de intentos de login fallidos de más de un día — no hace
    // falta guardarlos más tiempo, el bloqueo solo mira los últimos 15
    // minutos.
    prisma.intentoLoginFallido.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    // Certificaciones: pasan solas a "En curso" o "Acabada" según sus
    // fechas, sin que nadie tenga que entrar a cambiarlas a mano.
    actualizarEstadosCertificacionesPorFecha(),
  ]);

  return NextResponse.json({
    excel: excel.status === "fulfilled" ? excel.value : { error: excel.reason instanceof Error ? excel.reason.message : "Error desconocido" },
    bbdd: bbdd.status === "fulfilled" ? bbdd.value : { error: bbdd.reason instanceof Error ? bbdd.reason.message : "Error desconocido" },
    certificaciones: certificaciones.status === "fulfilled" ? certificaciones.value : { error: certificaciones.reason instanceof Error ? certificaciones.reason.message : "Error desconocido" },
  });
}
