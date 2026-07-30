import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.upsert({
    where: { id: "demo-school" },
    update: {},
    create: {
      id: "demo-school",
      name: "Centro Demo",
    },
  });

  const passwordHash = await bcrypt.hash("Admin1234!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@gescoles.com" },
    update: {
      passwordHash,
    },
    create: {
      email: "admin@gescoles.com",
      passwordHash,
      name: "Administrador",
      role: Role.SUPERADMIN,
      schoolId: school.id,
    },
  });

  console.log("Usuario creado/actualizado:");
  console.log(`  Email: ${admin.email}`);
  console.log(`  Contraseña: Admin1234!`);
  console.log(`  Rol: ${admin.role}`);

  // --- Datos de ejemplo para el panel de Coordinación/Dirección ---
  const coordPasswordHash = await bcrypt.hash("Coord1234!", 10);
  const coordinador = await prisma.user.upsert({
    where: { email: "coordinacion@gescoles.com" },
    update: {},
    create: {
      email: "coordinacion@gescoles.com",
      passwordHash: coordPasswordHash,
      name: "Sara Alonso",
      role: Role.COORDINADOR,
      schoolId: school.id,
    },
  });
  console.log(`  Coordinador: ${coordinador.email} / Coord1234!`);

  const profesoresData = [
    { email: "marta.rodriguez@demo.com", name: "Marta Rodríguez" },
    { email: "carlos.garcia@demo.com", name: "Carlos García" },
    { email: "paula.lopez@demo.com", name: "Paula López" },
  ];
  const profPasswordHash = await bcrypt.hash("Profesor1234!", 10);
  const profesores = [];
  for (const p of profesoresData) {
    const created = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: profPasswordHash,
        name: p.name,
        role: Role.PROFESOR,
        schoolId: school.id,
      },
    });
    profesores.push(created);
  }

  // Solo se crean datos de ejemplo si todavía no hay ninguna tutoría (evita duplicar en cada seed)
  const tutoriasExistentes = await prisma.tutoria.count({ where: { schoolId: school.id } });
  if (tutoriasExistentes === 0) {
    const hoy = new Date();
    const diasAtras = (n: number) => new Date(hoy.getTime() - n * 24 * 60 * 60 * 1000);

    await prisma.tutoria.createMany({
      data: [
        { schoolId: school.id, profesorId: profesores[0].id, studentName: "Alumno 1º DAM A", cicloModulo: "1º DAM", status: "NUEVA", sessionDate: diasAtras(1) },
        { schoolId: school.id, profesorId: profesores[0].id, studentName: "Alumno 1º DAM B", cicloModulo: "1º DAM", status: "SEGUIMIENTO", sessionDate: diasAtras(2) },
        { schoolId: school.id, profesorId: profesores[1].id, studentName: "Alumno 2º DAW A", cicloModulo: "2º DAW", status: "COMPLETADA", sessionDate: diasAtras(3) },
        { schoolId: school.id, profesorId: profesores[1].id, studentName: "Alumno 2º DAW B", cicloModulo: "2º DAW", status: "PENDIENTE", sessionDate: diasAtras(4) },
        { schoolId: school.id, profesorId: profesores[2].id, studentName: "Alumno FP Básica A", cicloModulo: "FP Básica", status: "SEGUIMIENTO", sessionDate: diasAtras(5) },
      ],
    });

    await prisma.guardia.createMany({
      data: [
        { schoolId: school.id, profesorId: profesores[0].id, turno: "Guardia - Turno A", ubicacion: "Edificio Principal", fecha: diasAtras(-1), status: "PROGRAMADA" },
        { schoolId: school.id, profesorId: profesores[1].id, turno: "Guardia - Turno B", ubicacion: "Edificio Secundario", fecha: diasAtras(-2), status: "PROGRAMADA" },
        { schoolId: school.id, profesorId: profesores[2].id, turno: "Revisión de cobertura", ubicacion: "2º CFGS Desarrollo Web", fecha: diasAtras(0), status: "CUBIERTA" },
      ],
    });

    await prisma.materialRequest.createMany({
      data: [
        { schoolId: school.id, profesorId: profesores[0].id, cicloModulo: "1º CFGM Instalaciones Eléctricas", materialName: "Kit de destornilladores aislados", cantidad: 2, prioridad: "ALTA", costeEstimado: 120, status: "PENDIENTE" },
        { schoolId: school.id, profesorId: profesores[1].id, cicloModulo: "2º CFGS Desarrollo de Aplicaciones Web", materialName: "Licencias Visual Studio Professional", cantidad: 10, prioridad: "ALTA", costeEstimado: 4990, status: "EN_REVISION" },
        { schoolId: school.id, profesorId: profesores[2].id, cicloModulo: "1º CFGS Administración de Sistemas", materialName: "Crimpadora RJ45", cantidad: 1, prioridad: "MEDIA", costeEstimado: 89.9, status: "APROBADO" },
      ],
    });

    console.log("Datos de ejemplo de tutorías, guardias y material creados.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
