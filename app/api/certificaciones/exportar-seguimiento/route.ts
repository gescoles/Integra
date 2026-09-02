import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildSeguimientoAsignacionesWorkbook, safeFileName } from "@/lib/exportWorkbooks";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;

  if (!session?.user || (role !== "SUPERADMIN" && role !== "COORDINADOR" && role !== "ADMIN_CENTRO" && role !== "ADMINISTRACION")) {
    return new NextResponse("No autorizado.", { status: 403 });
  }

  const schoolId = req.nextUrl.searchParams.get("school") ?? session.user.schoolId;
  if (!schoolId || schoolId !== session.user.schoolId) {
    return new NextResponse("No autorizado para ese centro.", { status: 403 });
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  if (!school) return new NextResponse("Centro no encontrado.", { status: 404 });

  const workbook = await buildSeguimientoAsignacionesWorkbook(schoolId);
  const buffer = await workbook.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Seguimiento_Certificaciones_${safeFileName(school.name)}_${fecha}.xlsx"`,
    },
  });
}
