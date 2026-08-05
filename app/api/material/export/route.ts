import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

const CATEGORIA_LABELS: Record<string, string> = {
  ELECTRONICA: "Electrónica",
  COMPONENTES: "Componentes",
  HERRAMIENTAS: "Herramientas",
  OTROS: "Otros",
};

const ESTADO_LABELS: Record<string, string> = {
  EN_STOCK: "En stock",
  BAJO_STOCK: "Bajo stock",
  AGOTADO: "Agotado",
};

// Excel no permite ciertos caracteres en el nombre de una pestaña, ni más
// de 31 caracteres.
function sheetName(base: string, used: Set<string>) {
  let clean = base.replace(/[:\\/?*[\]]/g, "").trim().slice(0, 31) || "Ciclo";
  let name = clean;
  let i = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${i})`;
    name = clean.slice(0, 31 - suffix.length) + suffix;
    i++;
  }
  used.add(name.toLowerCase());
  return name;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;

  if (!session?.user || (role !== "SUPERADMIN" && role !== "COORDINADOR" && role !== "ADMIN_CENTRO")) {
    return new NextResponse("No autorizado.", { status: 403 });
  }

  const schoolIdParam = req.nextUrl.searchParams.get("school");
  const profesorIdParam = req.nextUrl.searchParams.get("profesor");
  // Un Coordinador/Admin de centro solo puede exportar su propio centro,
  // ignorando cualquier otro id que le pasen por la URL.
  const schoolId = role === "SUPERADMIN" ? schoolIdParam : session.user.schoolId;

  if (!schoolId) {
    return new NextResponse("Falta indicar el centro.", { status: 400 });
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  if (!school) {
    return new NextResponse("Centro no encontrado.", { status: 404 });
  }

  const materialRaw = await prisma.materialRequest.findMany({
    where: { schoolId, ...(profesorIdParam ? { profesorId: profesorIdParam } : {}) },
    include: { profesor: { select: { name: true, email: true } } },
    orderBy: [{ curso: "asc" }, { createdAt: "desc" }],
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Integra";
  workbook.created = new Date();

  const ciclos = Array.from(new Set(materialRaw.map((m) => m.curso))).sort();
  const usedNames = new Set<string>();

  for (const ciclo of ciclos) {
    const items = materialRaw.filter((m) => m.curso === ciclo);
    const sheet = workbook.addWorksheet(sheetName(ciclo, usedNames));

    sheet.columns = [
      { header: "Material", key: "nombre", width: 26 },
      { header: "Asignatura", key: "asignatura", width: 18 },
      { header: "Categoría", key: "categoria", width: 16 },
      { header: "Cantidad", key: "cantidad", width: 10 },
      { header: "Precio/ud", key: "precioUnidad", width: 12 },
      { header: "Total", key: "total", width: 12 },
      { header: "Proveedor", key: "proveedor", width: 20 },
      { header: "Enlace", key: "enlace", width: 28 },
      { header: "Justificación", key: "justificacion", width: 34 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Solicitado por", key: "profesor", width: 22 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1D4D" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    items.forEach((m) => {
      const row = sheet.addRow({
        nombre: m.nombre,
        asignatura: m.asignatura,
        categoria: CATEGORIA_LABELS[m.categoria] ?? m.categoria,
        cantidad: m.cantidad,
        precioUnidad: m.precioUnidad,
        total: m.precioUnidad * m.cantidad,
        proveedor: m.proveedor,
        enlace: m.enlace ?? "—",
        justificacion: m.justificacion,
        estado: ESTADO_LABELS[m.estado] ?? m.estado,
        profesor: m.profesor?.name ?? m.profesor?.email ?? "—",
      });
      row.getCell("precioUnidad").numFmt = "#,##0.00 €";
      row.getCell("total").numFmt = "#,##0.00 €";
      row.alignment = { vertical: "middle", wrapText: true };
    });

    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      });
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        });
      }
    });

    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: "K1" };
  }

  if (workbook.worksheets.length === 0) {
    const sheet = workbook.addWorksheet("Material");
    sheet.addRow(["Todavía no se ha pedido ningún material en este centro."]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = school.name.replace(/[^a-z0-9áéíóúñ]+/gi, "_");
  const fecha = new Date().toISOString().slice(0, 10);
  const profesorSolo = profesorIdParam && materialRaw[0]
    ? `_${(materialRaw[0].profesor?.name ?? materialRaw[0].profesor?.email ?? "").replace(/[^a-z0-9áéíóúñ]+/gi, "_")}`
    : "";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Material_${safeName}${profesorSolo}_${fecha}.xlsx"`,
    },
  });
}
