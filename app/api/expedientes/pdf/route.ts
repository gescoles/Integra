import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getExpedienteData, buildExpedientePdf } from "@/lib/expedienteDocs";
import { safeFileName } from "@/lib/exportWorkbooks";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return new NextResponse("No autorizado.", { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return new NextResponse("Falta el identificador.", { status: 400 });

  const data = await getExpedienteData(id);
  if (!data) return new NextResponse("No se ha encontrado el expediente.", { status: 404 });

  const bytes = await buildExpedientePdf(data);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Expedient_${data.numero}_${safeFileName(data.alumnoNombre)}.pdf"`,
    },
  });
}
