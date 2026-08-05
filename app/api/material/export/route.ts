import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildMaterialWorkbook, safeFileName } from "@/lib/exportWorkbooks";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;

  if (!session?.user || (role !== "SUPERADMIN" && role !== "COORDINADOR" && role !== "ADMIN_CENTRO")) {
    return new NextResponse("No autorizado.", { status: 403 });
  }

  const schoolIdParam = req.nextUrl.searchParams.get("school");
  const profesorIdParam = req.nextUrl.searchParams.get("profesor");
  const schoolId = role === "SUPERADMIN" ? schoolIdParam : session.user.schoolId;

  if (!schoolId) {
    return new NextResponse("Falta indicar el centro.", { status: 400 });
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  if (!school) {
    return new NextResponse("Centro no encontrado.", { status: 404 });
  }

  const { workbook, profesorNombre } = await buildMaterialWorkbook(schoolId, profesorIdParam);

  const buffer = await workbook.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);
  const sufijoProfesor = profesorIdParam && profesorNombre ? `_${safeFileName(profesorNombre)}` : "";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Material_${safeFileName(school.name)}${sufijoProfesor}_${fecha}.xlsx"`,
    },
  });
}
