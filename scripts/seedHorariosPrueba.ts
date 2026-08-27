// Script puntual para preparar 4 usuarios de prueba del módulo de
// Guardias: les pone el rol que toca y les crea un horario con clases
// normales + horas de guardia, solapadas a propósito entre ellos para
// poder probar avisos de ausencia y asignación de sustitutos de verdad.
//
// Cómo ejecutarlo:
//   npm run seed:horarios-prueba
//
// Es seguro ejecutarlo varias veces: antes de crear nada, borra los
// bloques de horario que ya tuvieran estos 4 usuarios (para no ir
// duplicando cada vez que lo lances), y no toca el horario de nadie más.
// El rol si se vuelve a ejecutar, simplemente se vuelve a dejar igual.
//
// Los 4 usuarios tienen que existir ya en Docentium (con ese email) antes
// de ejecutar esto — el script no los crea, solo les cambia el rol y les
// añade el horario.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USUARIOS = [
  { email: "jassinformatic@gmail.com", role: "COORDINADOR" as const },
  { email: "jassrouseau@gmail.com", role: "PROFESOR" as const },
  { email: "tosinet93@gmail.com", role: "PROFESOR" as const },
  { email: "doc3ntium@gmail.com", role: "PROFESOR" as const },
];

// diaSemana: 1 = lunes, 2 = martes, 3 = miércoles, 4 = jueves, 5 = viernes
// (mismo criterio que usa el resto de la app: getUTCDay() con domingo=7).

async function main() {
  const emails = USUARIOS.map((u) => u.email);
  const usuarios = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, name: true },
  });

  const faltan = emails.filter((e) => !usuarios.some((u) => u.email === e));
  if (faltan.length > 0) {
    console.error(
      `No se han encontrado estos usuarios en Docentium (créalos primero desde el panel):\n  - ${faltan.join("\n  - ")}`
    );
    process.exit(1);
  }

  const porEmail = new Map(usuarios.map((u) => [u.email, u]));

  // Ponemos a cada uno el rol que toca.
  for (const u of USUARIOS) {
    await prisma.user.update({
      where: { id: porEmail.get(u.email)!.id },
      data: { role: u.role },
    });
  }

  const jassinformatic = porEmail.get("jassinformatic@gmail.com")!;
  const jassrouseau = porEmail.get("jassrouseau@gmail.com")!;
  const tosinet93 = porEmail.get("tosinet93@gmail.com")!;
  const do3enctium = porEmail.get("doc3ntium@gmail.com")!;

  const ids = [jassinformatic.id, jassrouseau.id, tosinet93.id, do3enctium.id];
  await prisma.horarioBloque.deleteMany({ where: { profesorId: { in: ids } } });

  // Todos tienen clases normales (para poder avisar de que faltan) y horas
  // de guardia (para poder cubrir a otro), solapadas a propósito:
  //
  //   lunes 9-10   -> cubren: jassrouseau, tosinet93
  //   lunes 10-11  -> cubre solo: tosinet93
  //   miércoles 10-11 -> cubre solo: jassrouseau
  //   jueves 10-11 -> cubre solo: jassinformatic

  await prisma.horarioBloque.createMany({
    data: [
      // ---- jassinformatic (Coordinador/a) ----
      { profesorId: jassinformatic.id, diaSemana: 1, horaInicio: "09:00", horaFin: "10:00", asignatura: "Matemàtiques", grupo: "2DAM", aula: "E12", color: "#2F6FED" },
      { profesorId: jassinformatic.id, diaSemana: 3, horaInicio: "09:00", horaFin: "10:00", asignatura: "Matemàtiques", grupo: "1DAM", aula: "E11", color: "#2F6FED" },
      { profesorId: jassinformatic.id, diaSemana: 2, horaInicio: "09:00", horaFin: "11:00", asignatura: "Guàrdia", grupo: null, aula: null, color: "#F59E0B", esGuardia: true },
      { profesorId: jassinformatic.id, diaSemana: 4, horaInicio: "09:00", horaFin: "11:00", asignatura: "Guàrdia", grupo: null, aula: null, color: "#F59E0B", esGuardia: true },

      // ---- jassrouseau (Profesor) ----
      { profesorId: jassrouseau.id, diaSemana: 1, horaInicio: "10:00", horaFin: "11:00", asignatura: "Programació", grupo: "2DAM", aula: "E12", color: "#10B981" },
      { profesorId: jassrouseau.id, diaSemana: 4, horaInicio: "09:00", horaFin: "10:00", asignatura: "Anglès", grupo: "1ASIX", aula: "E21", color: "#10B981" },
      { profesorId: jassrouseau.id, diaSemana: 1, horaInicio: "09:00", horaFin: "10:00", asignatura: "Guàrdia", grupo: null, aula: null, color: "#F59E0B", esGuardia: true },
      { profesorId: jassrouseau.id, diaSemana: 3, horaInicio: "09:00", horaFin: "11:00", asignatura: "Guàrdia", grupo: null, aula: null, color: "#F59E0B", esGuardia: true },

      // ---- tosinet93 (Profesor) ----
      { profesorId: tosinet93.id, diaSemana: 2, horaInicio: "11:00", horaFin: "12:00", asignatura: "Física", grupo: "2ASIX", aula: "E22", color: "#8B5CF6" },
      { profesorId: tosinet93.id, diaSemana: 3, horaInicio: "10:00", horaFin: "11:00", asignatura: "Química", grupo: "1ASIX", aula: "E21", color: "#8B5CF6" },
      { profesorId: tosinet93.id, diaSemana: 1, horaInicio: "09:00", horaFin: "11:00", asignatura: "Guàrdia", grupo: null, aula: null, color: "#F59E0B", esGuardia: true },
      { profesorId: tosinet93.id, diaSemana: 4, horaInicio: "09:00", horaFin: "10:00", asignatura: "Guàrdia", grupo: null, aula: null, color: "#F59E0B", esGuardia: true },

      // ---- do3enctium (Profesor) ----
      { profesorId: do3enctium.id, diaSemana: 1, horaInicio: "11:00", horaFin: "12:00", asignatura: "Bases de Dades", grupo: "2DAM", aula: "E12", color: "#EC4899" },
      { profesorId: do3enctium.id, diaSemana: 4, horaInicio: "10:00", horaFin: "11:00", asignatura: "Xarxes", grupo: "2SIMIX", aula: "E23", color: "#EC4899" },
      { profesorId: do3enctium.id, diaSemana: 3, horaInicio: "09:00", horaFin: "10:00", asignatura: "Guàrdia", grupo: null, aula: null, color: "#F59E0B", esGuardia: true },
      { profesorId: do3enctium.id, diaSemana: 2, horaInicio: "09:00", horaFin: "10:00", asignatura: "Guàrdia", grupo: null, aula: null, color: "#F59E0B", esGuardia: true },
    ],
  });

  console.log("Usuarios preparados:");
  console.log(`  - ${jassinformatic.name ?? jassinformatic.email} (${jassinformatic.email}) -> COORDINADOR`);
  console.log(`  - ${jassrouseau.name ?? jassrouseau.email} (${jassrouseau.email}) -> PROFESOR`);
  console.log(`  - ${tosinet93.name ?? tosinet93.email} (${tosinet93.email}) -> PROFESOR`);
  console.log(`  - ${do3enctium.name ?? do3enctium.email} (${do3enctium.email}) -> PROFESOR`);
  console.log("");
  console.log("Solapes pensados para probar el selector de sustitutos:");
  console.log("  Lunes 9-10h   -> disponibles: jassrouseau, tosinet93 (2 opciones)");
  console.log("  Lunes 10-11h  -> disponible solo: tosinet93");
  console.log("  Miércoles 10-11h -> disponible solo: jassrouseau");
  console.log("  Jueves 10-11h -> disponible solo: jassinformatic");
  console.log("");
  console.log("Prueba: entra como un profesor, avisa de ausencia el lunes 9-10h,");
  console.log("y luego como jassinformatic (Coordinador/a) acepta y gestiona la guardia.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
