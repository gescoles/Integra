"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role, UserStatus } from "@prisma/client";
import { generatePassword } from "@/lib/generatePassword";
import { sendPasswordEmail } from "@/lib/email";

export async function createUser(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const dni = (formData.get("dni") as string)?.trim();
  const role = formData.get("role") as Role;
  const schoolId = (formData.get("schoolId") as string) || null;
  const autoPassword = formData.get("autoPassword") === "on";
  const manualPassword = formData.get("password") as string;

  if (!name) throw new Error("El nombre es obligatorio.");
  if (!email) throw new Error("El email es obligatorio.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Ya existe un usuario con ese email.");
  }

  let plainPassword: string;
  if (autoPassword) {
    plainPassword = generatePassword(8);
  } else {
    if (!manualPassword || manualPassword.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres.");
    }
    plainPassword = manualPassword;
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      dni: dni || null,
      passwordHash,
      role,
      schoolId,
    },
  });

  if (autoPassword) {
    try {
      await sendPasswordEmail(email, name, plainPassword);
    } catch (e) {
      console.error("Error enviando email de contraseña:", e);
      throw new Error(
        "El usuario se creó correctamente, pero no se pudo enviar el correo con la contraseña. Revisa la configuración de email (variables SMTP_*)."
      );
    }
  }

  revalidatePath("/dashboard/usuarios");
}

export async function updateUser(formData: FormData) {
  const id = formData.get("id") as string;
  const role = formData.get("role") as Role;
  const status = formData.get("status") as UserStatus;
  const schoolId = (formData.get("schoolId") as string) || null;

  if (!id) throw new Error("Falta el identificador del usuario.");

  await prisma.user.update({
    where: { id },
    data: { role, status, schoolId },
  });

  revalidatePath("/dashboard/usuarios");
}
