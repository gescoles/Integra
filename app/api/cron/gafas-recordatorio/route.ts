import { NextRequest, NextResponse } from "next/server";
import { enviarRecordatoriosGafasNoDevueltas } from "@/app/dashboard/espacios/gafasVR";

// Pensada para que Vercel la llame cada 15-30 minutos (no una vez al
// día como el backup) — así el aviso llega poco después de pasar la
// hora de margen, no al día siguiente.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  const resultado = await enviarRecordatoriosGafasNoDevueltas();
  return NextResponse.json(resultado);
}
