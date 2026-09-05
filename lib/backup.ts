import { prisma } from "@/lib/prisma";
import { ensureSubfolder, uploadGenericFileToDrive } from "@/lib/googleDrive";
import { uploadFileToOneDrive } from "@/lib/oneDrive";
import { safeFileName } from "@/lib/exportWorkbooks";

// Además de Google Drive, un centro puede tener configurado (desde el
// panel de SuperAdmin) un correo de OneDrive propio donde recibir
// también su copia. Si no lo tiene configurado, no se sube nada ahí —
// los demás centros no se ven afectados por esto.
// Mejor esfuerzo: si OneDrive falla, la copia en Google Drive ya se ha
// hecho igualmente y no se interrumpe nada por esto.
export async function subirBackupOneDriveSiCorresponde(
  oneDriveBackupEmail: string | null | undefined,
  nombreCentro: string,
  archivos: { nombre: string; buffer: Buffer; contentType: string }[],
  subcarpeta?: string
) {
  if (!oneDriveBackupEmail) return;

  const carpeta = subcarpeta
    ? `Docentium_Backup/${safeFileName(nombreCentro)}/${subcarpeta}`
    : `Docentium_Backup/${safeFileName(nombreCentro)}`;

  try {
    for (const archivo of archivos) {
      await uploadFileToOneDrive(oneDriveBackupEmail, `${carpeta}/${archivo.nombre}`, archivo.buffer, archivo.contentType);
    }
  } catch (e) {
    console.error(`No se pudo subir el backup de "${nombreCentro}" a OneDrive:`, e);
  }
}

// Todas las tablas "normales" del sistema, en el orden en el que aparecen
// en el schema. Como el restaurado desactiva temporalmente la comprobación
// de claves foráneas (ver más abajo), NO hace falta que este orden respete
// las relaciones entre ellas: es solo para que la copia sea legible.
export const MODELOS_BACKUP = [
  "school",
  "departamento",
  "incidencia",
  "onboardingCarpeta",
  "onboardingArchivo",
  "espacioPlanta",
  "espacioAula",
  "espacioReserva",
  "expediente",
  "incidenciaEvento",
  "historia",
  "historiaVista",
  "user",
  "tutoria",
  "alumno",
  "alumnoContacto",
  "chatbotEntry",
  "chatbotPreguntaSinResponder",
  "notificacion",
  "salida",
  "practicaAlumno",
  "convenio",
  "tutoriaSeguimiento",
  "prorroga",
  "guardia",
  "materialRequest",
  "horarioBloque",
  "coberturaGuardia",
  "calendarEvento",
  "aviso",
  "empresa",
  "empresaDocumento",
  "empresaHistorial",
  "empresaObservacion",
  "proyectoVentana",
  "proyecto",
  "proyectoTipoNota",
  "proyectoGrupo",
  "proyectoNota",
  "calendarioEscolarEvento",
] as const;

// Las relaciones muchos-a-muchos de Departamento no son "modelos" propios
// de Prisma; hay que copiarlas aparte, directamente de sus tablas.
const TABLAS_M2M = ["_DepartamentoProfesores", "_DepartamentoCoordinadores"] as const;

export type CopiaSeguridad = {
  version: 1;
  generadaEn: string;
  datos: Record<string, unknown[]>;
  relaciones: Record<string, { A: string; B: string }[]>;
};

/**
 * Saca una foto completa de todas las tablas de la base de datos, tal
 * cual están ahora mismo.
 */
export async function generarCopiaSeguridad(): Promise<CopiaSeguridad> {
  const datos: Record<string, unknown[]> = {};

  for (const modelo of MODELOS_BACKUP) {
    // @ts-expect-error -- acceso dinámico al modelo de Prisma por nombre
    datos[modelo] = await prisma[modelo].findMany();
  }

  const relaciones: Record<string, { A: string; B: string }[]> = {};
  for (const tabla of TABLAS_M2M) {
    relaciones[tabla] = await prisma.$queryRawUnsafe(`SELECT * FROM "${tabla}"`);
  }

  return {
    version: 1,
    generadaEn: new Date().toISOString(),
    datos,
    relaciones,
  };
}

/**
 * Vacía la base de datos entera y la vuelve a rellenar con lo que hay en
 * la copia de seguridad. Va todo dentro de UNA transacción: si algo
 * fallara a mitad, no se queda la base de datos a medias, se deshace todo.
 *
 * Usamos "session_replication_role = replica" para desactivar
 * temporalmente la comprobación de claves foráneas mientras se borra y
 * se vuelve a insertar todo. Así no importa en qué orden se haga: es
 * exactamente el mismo mecanismo que usan las herramientas de backup de
 * verdad, y evita el tipo de error que tuvimos antes con los borrados
 * manuales por SQL.
 */
export async function restaurarCopiaSeguridad(copia: CopiaSeguridad) {
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET session_replication_role = replica;`);

      // Vaciar todo (tablas normales + las de relación M2M)
      for (const modelo of [...MODELOS_BACKUP].reverse()) {
        // @ts-expect-error -- acceso dinámico al modelo de Prisma por nombre
        await tx[modelo].deleteMany();
      }
      for (const tabla of TABLAS_M2M) {
        await tx.$executeRawUnsafe(`DELETE FROM "${tabla}";`);
      }

      // Volver a insertar todo desde la copia
      for (const modelo of MODELOS_BACKUP) {
        const filas = copia.datos[modelo];
        if (!filas || filas.length === 0) continue;
        // @ts-expect-error -- acceso dinámico al modelo de Prisma por nombre
        await tx[modelo].createMany({ data: filas });
      }
      for (const tabla of TABLAS_M2M) {
        const filas = copia.relaciones?.[tabla] ?? [];
        for (const fila of filas) {
          await tx.$executeRawUnsafe(`INSERT INTO "${tabla}" ("A", "B") VALUES ($1, $2)`, fila.A, fila.B);
        }
      }

      await tx.$executeRawUnsafe(`SET session_replication_role = origin;`);
    },
    { timeout: 120000, maxWait: 20000 }
  );
}

/**
 * Lo mismo que generarCopiaSeguridad(), pero solo con los datos de UN
 * centro — pensado para cuando un centro nuevo empieza y quieres guardar
 * (o más adelante mover) solo lo suyo, sin arrastrar el resto de centros.
 *
 * Cada tabla tiene su propia forma de llegar hasta "de qué centro es":
 * algunas lo saben directamente (tienen su propia columna schoolId), y
 * otras hay que preguntárselo a la tabla de la que dependen (p. ej. un
 * Convenio no sabe de qué centro es, pero la Ficha de Prácticas de la que
 * cuelga sí lo sabe).
 *
 * "chatbotEntry" se queda fuera a propósito: es contenido compartido de
 * todos los centros (preguntas frecuentes generales), no pertenece a
 * ninguno en concreto.
 */
// Para cada tabla, cómo llegar hasta "es de este centro" — algunas lo
// saben directamente (schoolId propio), otras hay que preguntárselo a la
// tabla de la que dependen. Se usa tanto para exportar como para borrar
// solo lo de un centro al restaurar (nunca para tocar los demás).
function construirFiltroPorCentro(schoolId: string): Record<string, unknown> {
  return {
    school: { id: schoolId },
    departamento: { schoolId },
    incidencia: { schoolId },
    onboardingCarpeta: { schoolId },
    onboardingArchivo: { carpeta: { schoolId } },
    espacioPlanta: { schoolId },
    espacioAula: { planta: { schoolId } },
    espacioReserva: { aula: { planta: { schoolId } } },
    expediente: { schoolId },
    incidenciaEvento: { incidencia: { schoolId } },
    historia: { schoolId },
    historiaVista: { historia: { schoolId } },
    user: { schoolId },
    tutoria: { schoolId },
    alumno: { schoolId },
    alumnoContacto: { alumno: { schoolId } },
    chatbotEntry: null, // compartido entre todos los centros — se omite
    chatbotPreguntaSinResponder: null, // igual, es global del chatbot
    notificacion: { schoolId },
    salida: { schoolId },
    practicaAlumno: { schoolId },
    convenio: { practicaAlumno: { schoolId } },
    tutoriaSeguimiento: { convenio: { practicaAlumno: { schoolId } } },
    prorroga: { convenio: { practicaAlumno: { schoolId } } },
    guardia: { schoolId },
    materialRequest: { schoolId },
    horarioBloque: { profesor: { schoolId } },
    coberturaGuardia: { schoolId },
    calendarEvento: { user: { schoolId } },
    aviso: { schoolId },
    empresa: { schoolId },
    empresaDocumento: { empresa: { schoolId } },
    empresaHistorial: { empresa: { schoolId } },
    empresaObservacion: { empresa: { schoolId } },
    proyectoVentana: null, // son las pestañas del módulo, compartidas por toda la plataforma — se omiten
    proyecto: { schoolId },
    proyectoTipoNota: { proyecto: { schoolId } },
    proyectoGrupo: { proyecto: { schoolId } },
    proyectoNota: { proyectoGrupo: { proyecto: { schoolId } } },
    calendarioEscolarEvento: { schoolId },
  };
}

export async function generarCopiaSeguridadPorCentro(schoolId: string): Promise<CopiaSeguridad> {
  const datos: Record<string, unknown[]> = {};
  const filtroPorModelo = construirFiltroPorCentro(schoolId);

  for (const modelo of MODELOS_BACKUP) {
    const filtro = filtroPorModelo[modelo];
    if (filtro === null) {
      datos[modelo] = [];
      continue;
    }
    // @ts-expect-error -- acceso dinámico al modelo de Prisma por nombre
    datos[modelo] = await prisma[modelo].findMany({ where: filtro });
  }

  // Las relaciones muchos-a-muchos de Departamento (profesores/coordinadores
  // de ese centro) se filtran a partir de los departamentos ya obtenidos.
  const idsDepartamentos = new Set((datos.departamento as { id: string }[]).map((d) => d.id));
  const relaciones: Record<string, { A: string; B: string }[]> = {};
  for (const tabla of TABLAS_M2M) {
    const todas = await prisma.$queryRawUnsafe<{ A: string; B: string }[]>(`SELECT * FROM "${tabla}"`);
    relaciones[tabla] = todas.filter((r) => idsDepartamentos.has(r.A));
  }

  return {
    version: 1,
    generadaEn: new Date().toISOString(),
    datos,
    relaciones,
  };
}

// Convierte un valor de JS al literal SQL equivalente, para poder escribir
// un archivo .sql "de verdad" que se pueda pegar y ejecutar directamente
// en Supabase (SQL Editor o psql), sin depender para nada de esta app.
function valorASQL(valor: unknown): string {
  if (valor === null || valor === undefined) return "NULL";
  if (typeof valor === "boolean") return valor ? "TRUE" : "FALSE";
  if (typeof valor === "number") return String(valor);
  if (valor instanceof Date) return `'${valor.toISOString()}'`;
  if (Array.isArray(valor)) {
    if (valor.length === 0) return "'{}'";
    return `ARRAY[${valor.map((v) => valorASQL(v)).join(",")}]`;
  }
  if (typeof valor === "object") {
    // Campo JSON: se guarda como texto y se convierte con ::jsonb.
    const texto = JSON.stringify(valor).replace(/'/g, "''");
    return `'${texto}'::jsonb`;
  }
  // String: escapar comillas simples duplicándolas, como exige SQL.
  const texto = String(valor).replace(/'/g, "''");
  return `'${texto}'`;
}

// Nombre real de cada tabla en Postgres — en este proyecto coincide
// siempre con el nombre del modelo en el schema (no se usa @map en
// ningún sitio), así que solo hay que poner la primera letra en
// mayúscula.
function nombreTabla(modelo: string): string {
  return modelo.charAt(0).toUpperCase() + modelo.slice(1);
}

/**
 * Genera un archivo .sql real y autocontenido con TODOS los datos de un
 * centro — pensado para ejecutarlo directamente en Supabase (SQL Editor o
 * psql) el día que haga falta reponer los datos de ese centro, sin
 * depender de esta aplicación para restaurar. Es información
 * complementaria a la copia de seguridad general (JSON) que ya existía:
 * esta no la toca ni la sustituye.
 *
 * Puntos importantes para cuando se ejecute en Supabase:
 * - Empieza desactivando la comprobación de claves foráneas
 *   (session_replication_role), así que hace falta ejecutarlo con el
 *   usuario "postgres" (el que ya usa DATABASE_URL), no con un rol
 *   limitado — si no, esa línea fallará con un error de permisos.
 * - Cada INSERT lleva "ON CONFLICT (id) DO NOTHING", así que si el centro
 *   ya tuviera algunas de esas filas (por ID), no falla ni las duplica:
 *   solo añade lo que falte.
 */
export async function generarCopiaSeguridadSQLPorCentro(schoolId: string): Promise<string> {
  const copia = await generarCopiaSeguridadPorCentro(schoolId);

  const lineas: string[] = [];
  lineas.push(`-- Copia de seguridad SQL del centro (generada el ${copia.generadaEn})`);
  lineas.push(`-- Contiene solo los datos de este centro, no de los demás.`);
  lineas.push(`-- Para restaurar: pegar y ejecutar entero en Supabase (SQL Editor) o con psql.`);
  lineas.push("");
  lineas.push("BEGIN;");
  lineas.push("SET session_replication_role = replica;");
  lineas.push("");

  for (const modelo of MODELOS_BACKUP) {
    const filas = copia.datos[modelo] as Record<string, unknown>[] | undefined;
    if (!filas || filas.length === 0) continue;

    const tabla = nombreTabla(modelo);
    const columnas = Object.keys(filas[0]);
    const columnasSQL = columnas.map((c) => `"${c}"`).join(", ");

    lineas.push(`-- ${tabla}: ${filas.length} fila(s)`);
    for (const fila of filas) {
      const valores = columnas.map((c) => valorASQL(fila[c])).join(", ");
      lineas.push(`INSERT INTO "${tabla}" (${columnasSQL}) VALUES (${valores}) ON CONFLICT ("id") DO NOTHING;`);
    }
    lineas.push("");
  }

  for (const tabla of TABLAS_M2M) {
    const filas = copia.relaciones[tabla] ?? [];
    if (filas.length === 0) continue;
    lineas.push(`-- ${tabla}: ${filas.length} fila(s)`);
    for (const fila of filas) {
      lineas.push(`INSERT INTO "${tabla}" ("A", "B") VALUES (${valorASQL(fila.A)}, ${valorASQL(fila.B)}) ON CONFLICT DO NOTHING;`);
    }
    lineas.push("");
  }

  lineas.push("SET session_replication_role = origin;");
  lineas.push("COMMIT;");

  return lineas.join("\n");
}

/**
 * Restaura los datos de UN centro a partir de una copia generada con
 * generarCopiaSeguridadPorCentro() — sin tocar ni una fila de los demás
 * centros. A diferencia de restaurarCopiaSeguridad() (que vacía la base
 * de datos entera), esto solo borra y vuelve a rellenar lo que pertenece
 * a este centro en concreto.
 *
 * Comprobación de seguridad: si el archivo que se pasa no es una copia de
 * ESE centro (por ejemplo, si alguien intenta usar el .json general, o el
 * de otro centro), se rechaza antes de tocar nada.
 */
export async function restaurarCopiaSeguridadPorCentro(schoolId: string, copia: CopiaSeguridad) {
  const schoolsEnCopia = (copia.datos.school as { id: string }[] | undefined) ?? [];
  if (schoolsEnCopia.length !== 1 || schoolsEnCopia[0].id !== schoolId) {
    throw new Error(
      "Este archivo no es una copia de este centro (o es la copia general con varios centros mezclados) — no se puede usar aquí, por seguridad."
    );
  }

  const filtroPorModelo = construirFiltroPorCentro(schoolId);

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET session_replication_role = replica;`);

      // Borrar SOLO lo de este centro, tabla por tabla, en orden inverso.
      for (const modelo of [...MODELOS_BACKUP].reverse()) {
        const filtro = filtroPorModelo[modelo];
        if (filtro === null) continue; // tablas globales (chatbot): no se tocan
        // @ts-expect-error -- acceso dinámico al modelo de Prisma por nombre
        await tx[modelo].deleteMany({ where: filtro });
      }

      // Volver a insertar lo que traía la copia para este centro.
      for (const modelo of MODELOS_BACKUP) {
        const filas = copia.datos[modelo];
        if (!filas || filas.length === 0) continue;
        // @ts-expect-error -- acceso dinámico al modelo de Prisma por nombre
        await tx[modelo].createMany({ data: filas });
      }

      // Relaciones M2M de Departamento: solo las de los departamentos de
      // este centro (ya vienen filtradas así desde el propio backup).
      for (const tabla of TABLAS_M2M) {
        const filas = copia.relaciones?.[tabla] ?? [];
        for (const fila of filas) {
          await tx.$executeRawUnsafe(`INSERT INTO "${tabla}" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`, fila.A, fila.B);
        }
      }

      await tx.$executeRawUnsafe(`SET session_replication_role = origin;`);
    },
    { timeout: 120_000 }
  );
}

// Las dos carpetas de Drive donde vive el backup de un centro: una para
// los .json (los que sabe restaurar la propia app) y otra para los .sql
// (los que se pueden ejecutar directamente en Supabase, sin la app).
export async function carpetasBackupBBDD(rootFolderId: string, nombreCentro: string) {
  const schoolFolderId = await ensureSubfolder(rootFolderId, nombreCentro);
  const jsonFolderId = await ensureSubfolder(schoolFolderId, "Backup BBDD JSON");
  const sqlFolderId = await ensureSubfolder(schoolFolderId, "Backup BBDD SQL");
  return { jsonFolderId, sqlFolderId };
}

// Carpeta del botón "Crear copia de seguridad" — distinta de las de
// arriba (que usa "Backup BBDD instantáneo" y el cron de cada noche):
// esta es la que el propio texto del botón le promete al SuperAdmin
// ("...en la carpeta 'Copia de seguridad'"), así que tiene que llamarse
// literalmente así, dentro de la carpeta del centro.
export async function carpetaCopiaSeguridad(rootFolderId: string, nombreCentro: string) {
  const schoolFolderId = await ensureSubfolder(rootFolderId, nombreCentro);
  return ensureSubfolder(schoolFolderId, "Copia de seguridad");
}

/**
 * El cron de cada noche: genera el backup (json + sql) de TODOS los
 * centros, uno por uno, con el sufijo "automatico" en el nombre para
 * distinguirlo de los que se generan a mano desde el panel.
 */
export async function ejecutarBackupBBDDTodosCentros() {
  const rootFolderIdGlobal = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID;

  const schools = await prisma.school.findMany({ select: { id: true, name: true, driveBackupFolderId: true, oneDriveBackupEmail: true } });
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  const hora = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" }).format(new Date()).replace(":", "");

  const resultados: { centro: string; ok: boolean; error?: string }[] = [];

  for (const school of schools) {
    try {
      const copia = await generarCopiaSeguridadPorCentro(school.id);
      const sql = await generarCopiaSeguridadSQLPorCentro(school.id);
      const jsonBuffer = Buffer.from(JSON.stringify(copia), "utf-8");
      const sqlBuffer = Buffer.from(sql, "utf-8");
      const nombreJson = `backup-bbdd-automatico-${fecha}-${hora}.json`;
      const nombreSql = `backup-bbdd-automatico-${fecha}-${hora}.sql`;

      // Cada centro puede tener su propia carpeta raíz de Drive
      // configurada desde SuperAdmin; si no la tiene, se usa la carpeta
      // general de la cuenta de Drive ya conectada a la plataforma — cada
      // centro sigue yendo a su propia subcarpeta ahí dentro, nunca se
      // mezcla con otro.
      const rootFolderId = school.driveBackupFolderId || rootFolderIdGlobal;
      if (rootFolderId) {
        const { jsonFolderId, sqlFolderId } = await carpetasBackupBBDD(rootFolderId, safeFileName(school.name));
        await uploadGenericFileToDrive(jsonFolderId, nombreJson, jsonBuffer, "application/json");
        await uploadGenericFileToDrive(sqlFolderId, nombreSql, sqlBuffer, "text/plain");
      }
      await subirBackupOneDriveSiCorresponde(school.oneDriveBackupEmail, school.name, [{ nombre: nombreJson, buffer: jsonBuffer, contentType: "application/json" }], "Backup BBDD JSON");
      await subirBackupOneDriveSiCorresponde(school.oneDriveBackupEmail, school.name, [{ nombre: nombreSql, buffer: sqlBuffer, contentType: "text/plain" }], "Backup BBDD SQL");

      resultados.push({ centro: school.name, ok: true });
    } catch (e) {
      resultados.push({ centro: school.name, ok: false, error: e instanceof Error ? e.message : "Error desconocido" });
    }
  }

  return { fecha, resultados };
}
