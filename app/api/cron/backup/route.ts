import { NextRequest, NextResponse } from "next/server";
import { ejecutarBackupExcelModulos } from "@/lib/backupExcel";

export const maxDuration = 300; // 5 minutos: puede haber muchos centros que respaldar

export async function GET(req: NextRequest) {
  // Vercel añade automáticamente esta cabecera en las peticiones de Cron
  // Jobs cuando hay una variable de entorno CRON_SECRET configurada. Así
  // nadie más puede disparar el backup solo con adivinar la URL.
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  try {
    const { fecha, resultados } = await ejecutarBackupExcelModulos();
    return NextResponse.json({ fecha, resultados });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
