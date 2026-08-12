import { prisma } from "@/lib/prisma";

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
