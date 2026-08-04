import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

// Excel no permite ciertos caracteres en el nombre de una pestaña, ni más
// de 31 caracteres.
function sheetName(base: string, used: Set<string>) {
  let clean = base.replace(/[:\\/?*[\]]/g, "").trim().slice(0, 31) || "Profesor";
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

  const [school, profesoresRaw, alumnos, tutorias] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.alumno.findMany({
      where: { schoolId },
      select: { id: true, nombre: true, curso: true, profesorId: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.tutoria.findMany({
      where: { schoolId },
      select: { alumnoId: true, profesorId: true, conQuien: true, sessionDate: true },
    }),
  ]);

  if (!school) {
    return new NextResponse("Centro no encontrado.", { status: 404 });
  }

  // Si desde la tabla ya tenían un profesor concreto elegido, el Excel
  // descarga solo esa pestaña; si estaba en "Todos los profesores", se
  // descargan todas.
  const profesores = profesorIdParam
    ? profesoresRaw.filter((p) => p.id === profesorIdParam)
    : profesoresRaw;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Integra";
  workbook.created = new Date();

  const usedNames = new Set<string>();

  for (const profesor of profesores) {
    const alumnosDelProfesor = alumnos.filter((a) => a.profesorId === profesor.id);
    if (alumnosDelProfesor.length === 0) continue;

    const sheet = workbook.addWorksheet(sheetName(profesor.name ?? profesor.email, usedNames));

    sheet.columns = [
      { header: "Alumno", key: "alumno", width: 28 },
      { header: "Curso / Grupo", key: "curso", width: 16 },
      { header: "Profesor", key: "profesor", width: 24 },
      { header: "Tutorías con la familia", key: "familia", width: 20 },
      { header: "Tutorías con el alumno", key: "alumnoT", width: 20 },
      { header: "Con familia y alumno", key: "ambos", width: 18 },
      { header: "Total tutorías", key: "total", width: 14 },
      { header: "Última tutoría", key: "ultima", width: 16 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1D4D" } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    const profesorNombre = profesor.name ?? profesor.email;

    alumnosDelProfesor.forEach((alumno) => {
      const tutoriasAlumno = tutorias.filter((t) => t.alumnoId === alumno.id);
      const conFamilia = tutoriasAlumno.filter((t) => t.conQuien === "FAMILIA").length;
      const conAlumno = tutoriasAlumno.filter((t) => t.conQuien === "ALUMNO").length;
      const conAmbos = tutoriasAlumno.filter((t) => t.conQuien === "AMBOS").length;
      const ultima = [...tutoriasAlumno].sort(
        (a, b) => b.sessionDate.getTime() - a.sessionDate.getTime()
      )[0];

      const row = sheet.addRow({
        alumno: alumno.nombre,
        curso: alumno.curso,
        profesor: profesorNombre,
        familia: conFamilia,
        alumnoT: conAlumno,
        ambos: conAmbos,
        total: tutoriasAlumno.length,
        ultima: ultima ? ultima.sessionDate.toLocaleDateString("es-ES") : "—",
      });
      row.alignment = { vertical: "middle" };
    });

    // Rayas suaves alternas + borde inferior fino, para que se lea bien.
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
    sheet.autoFilter = { from: "A1", to: "H1" };
  }

  if (workbook.worksheets.length === 0) {
    const sheet = workbook.addWorksheet("Tutorías");
    sheet.addRow(["Todavía no hay profesores con alumnos asignados en este centro."]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = school.name.replace(/[^a-z0-9áéíóúñ]+/gi, "_");
  const fecha = new Date().toISOString().slice(0, 10);
  const profesorSolo =
    profesorIdParam && profesores[0]
      ? `_${(profesores[0].name ?? profesores[0].email).replace(/[^a-z0-9áéíóúñ]+/gi, "_")}`
      : "";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Tutorias_${safeName}${profesorSolo}_${fecha}.xlsx"`,
    },
  });
}
