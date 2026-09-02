import { NextRequest, NextResponse } from "next/server";
import { enviarRecordatoriosGafasNoDevueltas } from "@/app/dashboard/espacios/gafasVR";

// Se llama una vez al día (el plan Hobby de Vercel no permite crons más
// frecuentes) — el aviso puede tardar hasta 24h en llegar tras pasar la
// hora de margen, en vez de los ~30 minutos originales, pero nunca se
// duplica ni se pierde: se marca con recordatorioEnviado en cuanto se envía.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  const resultado = await enviarRecordatoriosGafasNoDevueltas();
  return NextResponse.json(resultado);
}
