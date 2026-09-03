import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildJustificantesWorkbook, safeFileName } from "@/lib/exportWorkbooks";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;

  if (!session?.user || (role !== "SUPERADMIN" && role !== "DIRECCION" && role !== "COORDINADOR" && role !== "ADMIN_CENTRO" && role !== "ADMINISTRACION")) {
    return new NextResponse("No autorizado.", { status: 403 });
  }

  const schoolIdParam = req.nextUrl.searchParams.get("school");
  const schoolId = role === "SUPERADMIN" ? schoolIdParam : session.user.schoolId;

  if (!schoolId) {
    return new NextResponse("Falta indicar el centro.", { status: 400 });
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  if (!school) {
    return new NextResponse("Centro no encontrado.", { status: 404 });
  }

  const workbook = await buildJustificantesWorkbook(schoolId);
  const buffer = await workbook.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Justificantes_${safeFileName(school.name)}_${fecha}.xlsx"`,
    },
  });
}
