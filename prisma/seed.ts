import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.upsert({
    where: { id: "demo-school" },
    update: {
      modules: ["tutorias", "guardias", "material"],
    },
    create: {
      id: "demo-school",
      name: "Centro Demo",
      modules: ["tutorias", "guardias", "material"],
    },
  });

  // Mantenemos las dos cuentas de SuperAdmin: la de siempre y la nueva.
  const passwordHashAntiguo = await bcrypt.hash("Admin1234!", 10);
  const adminAntiguo = await prisma.user.upsert({
    where: { email: "admin@gescoles.com" },
    update: {},
    create: {
      email: "admin@gescoles.com",
      passwordHash: passwordHashAntiguo,
      name: "Administrador",
      role: Role.SUPERADMIN,
      schoolId: school.id,
    },
  });

  const passwordHash = await bcrypt.hash("DariaJass1998ma?", 10);
  const admin = await prisma.user.upsert({
    where: { email: "gescoles@gmail.com" },
    update: {
      passwordHash,
    },
    create: {
      email: "gescoles@gmail.com",
      passwordHash,
      name: "Administrador",
      role: Role.SUPERADMIN,
      schoolId: school.id,
    },
  });

  console.log("Usuarios SuperAdmin creados/actualizados:");
  console.log(`  ${adminAntiguo.email} / Admin1234!`);
  console.log(`  ${admin.email} / DariaJass1998ma?`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
