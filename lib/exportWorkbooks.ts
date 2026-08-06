import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

// Excel no permite ciertos caracteres en el nombre de una pestaña, ni más
// de 31 caracteres.
function sheetName(base: string, used: Set<string>) {
  const clean = base.replace(/[:\\/?*[\]]/g, "").trim().slice(0, 31) || "Hoja";
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

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1D4D" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
}

function zebraStripe(sheet: ExcelJS.Worksheet) {
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
}

/**
 * Genera el Excel de Tutorías de un centro: una pestaña por profesor (o solo
 * la de un profesor concreto si se indica profesorId).
 */
export async function buildTutoriasWorkbook(schoolId: string, profesorId?: string | null) {
  const [profesoresRaw, alumnos, tutorias] = await Promise.all([
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

  const profesores = profesorId ? profesoresRaw.filter((p) => p.id === profesorId) : profesoresRaw;

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

    styleHeaderRow(sheet.getRow(1));

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

    zebraStripe(sheet);
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: "H1" };
  }

  if (workbook.worksheets.length === 0) {
    const sheet = workbook.addWorksheet("Tutorías");
    sheet.addRow(["Todavía no hay profesores con alumnos asignados en este centro."]);
  }

  return { workbook, profesorNombre: profesores[0] ? profesores[0].name ?? profesores[0].email : null };
}

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

/**
 * Genera el Excel de Material de un centro: una pestaña por ciclo/curso, con
 * todo lo que ha pedido cada profesor (o solo lo de un profesor concreto).
 */
export async function buildMaterialWorkbook(schoolId: string, profesorId?: string | null) {
  const materialRaw = await prisma.materialRequest.findMany({
    where: { schoolId, ...(profesorId ? { profesorId } : {}) },
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

    styleHeaderRow(sheet.getRow(1));

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

    zebraStripe(sheet);
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: "K1" };
  }

  if (workbook.worksheets.length === 0) {
    const sheet = workbook.addWorksheet("Material");
    sheet.addRow(["Todavía no se ha pedido ningún material en este centro."]);
  }

  const first = materialRaw[0];
  return { workbook, profesorNombre: profesorId && first ? first.profesor?.name ?? first.profesor?.email ?? null : null };
}

const SALIDA_ESTADO_LABELS_EXPORT: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

/**
 * Genera el Excel de Salidas de un centro: una pestaña por ciclo/curso, con
 * todas las salidas de ese curso (o solo las de un profesor concreto).
 */
export async function buildSalidasWorkbook(schoolId: string, responsableId?: string | null) {
  const salidasRaw = await prisma.salida.findMany({
    where: { schoolId, ...(responsableId ? { responsableId } : {}) },
    include: {
      responsable: { select: { name: true, email: true } },
      creadoPor: { select: { name: true, email: true } },
    },
    orderBy: [{ curso: "asc" }, { fecha: "desc" }],
  });

  // Para poder listar los nombres de los profesores que acompañan (guardados
  // como una simple lista de ids, no una relación de Prisma).
  const todosLosIds = Array.from(new Set(salidasRaw.flatMap((s) => s.profesoresIds)));
  const profesoresAcompanantes = todosLosIds.length
    ? await prisma.user.findMany({ where: { id: { in: todosLosIds } }, select: { id: true, name: true, email: true } })
    : [];
  const nombrePorId = new Map(profesoresAcompanantes.map((p) => [p.id, p.name ?? p.email]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Integra";
  workbook.created = new Date();

  const ciclos = Array.from(new Set(salidasRaw.map((s) => s.curso))).sort();
  const usedNames = new Set<string>();

  for (const ciclo of ciclos) {
    const items = salidasRaw.filter((s) => s.curso === ciclo);
    const sheet = workbook.addWorksheet(sheetName(ciclo, usedNames));

    sheet.columns = [
      { header: "Actividad", key: "actividad", width: 26 },
      { header: "Tipo", key: "tipo", width: 16 },
      { header: "Fecha", key: "fecha", width: 14 },
      { header: "Hora salida", key: "horaSalida", width: 12 },
      { header: "Hora vuelta", key: "horaVuelta", width: 16 },
      { header: "Responsable", key: "responsable", width: 22 },
      { header: "Acompañantes", key: "acompanantes", width: 26 },
      { header: "Nº alumnos", key: "numAlumnos", width: 12 },
      { header: "Coste", key: "costo", width: 12 },
      { header: "Observaciones", key: "observaciones", width: 30 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Creada por", key: "creadoPor", width: 22 },
    ];

    styleHeaderRow(sheet.getRow(1));

    items.forEach((s) => {
      const row = sheet.addRow({
        actividad: s.actividad,
        tipo: s.tipo,
        fecha: s.fecha.toLocaleDateString("es-ES"),
        horaSalida: s.horaSalida,
        horaVuelta: s.vueltaDirectaCasa ? "Vuelven directo a casa" : s.horaVuelta ?? "—",
        responsable: s.responsable?.name ?? s.responsable?.email ?? "—",
        acompanantes: s.profesoresIds.map((id) => nombrePorId.get(id) ?? "—").join(", ") || "—",
        numAlumnos: s.numAlumnos,
        costo: s.costo,
        observaciones: s.observaciones ?? "—",
        estado: SALIDA_ESTADO_LABELS_EXPORT[s.estado] ?? s.estado,
        creadoPor: s.creadoPor?.name ?? s.creadoPor?.email ?? "—",
      });
      row.getCell("costo").numFmt = `#,##0.00 "${s.moneda}"`;
      row.alignment = { vertical: "middle", wrapText: true };
    });

    zebraStripe(sheet);
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = { from: "A1", to: "L1" };
  }

  if (workbook.worksheets.length === 0) {
    const sheet = workbook.addWorksheet("Salidas");
    sheet.addRow(["Todavía no se ha creado ninguna salida en este centro."]);
  }

  const first = salidasRaw[0];
  return {
    workbook,
    profesorNombre: responsableId && first ? first.responsable?.name ?? first.responsable?.email ?? null : null,
  };
}

export function safeFileName(name: string) {
  return name.replace(/[^a-z0-9áéíóúñ]+/gi, "_");
}
