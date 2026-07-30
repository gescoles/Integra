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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
