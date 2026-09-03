import { NextRequest, NextResponse } from "next/server";
import { refrescarNoticiasEducacion } from "@/lib/noticiasAutoFetch";

// Cron diario (ver vercel.json): refresca la sección "Educación en
// España" de la web pública con la actualidad más relevante de España y
// Cataluña, en centros públicos, concertados y privados.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  try {
    const resultado = await refrescarNoticiasEducacion();
    return NextResponse.json(resultado);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error desconocido" }, { status: 500 });
  }
}
