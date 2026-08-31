import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildAccesosWorkbook } from "@/lib/exportWorkbooks";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "SUPERADMIN") {
    return new NextResponse("No autorizado.", { status: 401 });
  }

  const workbook = await buildAccesosWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Accesos-${fecha}.xlsx"`,
    },
  });
}
