"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role, UserStatus } from "@prisma/client";
import { generatePassword } from "@/lib/generatePassword";
import { sendPasswordEmail, sendInvitacionMicrosoftEmail } from "@/lib/email";
import { generateAvatarUrl } from "@/lib/avatar";

export async function createUser(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const dni = (formData.get("dni") as string)?.trim();
  const role = formData.get("role") as Role;
  const schoolId = (formData.get("schoolId") as string) || null;
  const loginMicrosoft = formData.get("loginMicrosoft") === "on";
  const autoPassword = formData.get("autoPassword") === "on";
  const manualPassword = formData.get("password") as string;

  if (!name) throw new Error("El nombre es obligatorio.");
  if (!email) throw new Error("El email es obligatorio.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("Ya existe un usuario con ese email.");
  }

  if (dni) {
    const existingDni = await prisma.user.findUnique({ where: { dni } });
    if (existingDni) {
      throw new Error("Ese DNI ya ha sido introducido por otro usuario. Revísalo o déjalo en blanco.");
    }
  }

  // Con inicio de sesión por Microsoft no hace falta que nadie escriba ni
  // vea ninguna contraseña — igualmente se guarda un hash aleatorio por
  // dentro, solo para cumplir con el campo obligatorio de la base de
  // datos; nunca se usa ni se comunica a nadie.
  let plainPassword: string;
  if (loginMicrosoft) {
    plainPassword = generatePassword(20);
  } else if (autoPassword) {
    plainPassword = generatePassword(8);
  } else {
    if (!manualPassword || manualPassword.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres.");
    }
    plainPassword = manualPassword;
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const avatarUrl = generateAvatarUrl(name);
  const departamentoIds = formData.getAll("departamentoIds") as string[];

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        dni: dni || null,
        passwordHash,
        role,
        schoolId,
        avatarUrl,
        // Los departamentos se guardan en el lado que corresponda según el
        // rol: como profesor perteneciente a ellos, o como coordinador que
        // los lleva.
        ...(role === "PROFESOR" && departamentoIds.length > 0
          ? { departamentos: { connect: departamentoIds.map((id) => ({ id })) } }
          : {}),
        ...(role === "COORDINADOR" && departamentoIds.length > 0
          ? { departamentosCoordinados: { connect: departamentoIds.map((id) => ({ id })) } }
          : {}),
      },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      const campo = Array.isArray(e?.meta?.target) ? e.meta.target[0] : e?.meta?.target;
      throw new Error(
        campo === "dni"
          ? "Ese DNI ya ha sido introducido por otro usuario."
          : campo === "email"
            ? "Ya existe un usuario con ese email."
            : "Ya existe un usuario con ese dato (email o DNI duplicado)."
      );
    }
    throw e;
  }

  if (loginMicrosoft) {
    try {
      await sendInvitacionMicrosoftEmail(email, name);
    } catch (e) {
      console.error("Error enviando email de invitación Microsoft:", e);
      throw new Error(
        "El usuario se creó correctamente, pero no se pudo enviar el correo de invitación. Revisa la configuración de email (variables SMTP_*)."
      );
    }
  } else if (autoPassword) {
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
  const departamentoIdsRaw = formData.getAll("departamentoIds") as string[];
  const seEnviaronDepartamentos = formData.has("departamentoIds");

  if (!id) throw new Error("Falta el identificador del usuario.");

  await prisma.user.update({
    where: { id },
    data: {
      role,
      status,
      schoolId,
      // "set" reemplaza toda la lista de golpe; solo se toca si el
      // formulario ha mandado explícitamente el campo de departamentos.
      ...(seEnviaronDepartamentos && role === "PROFESOR"
        ? { departamentos: { set: departamentoIdsRaw.map((did) => ({ id: did })) } }
        : {}),
      ...(seEnviaronDepartamentos && role === "COORDINADOR"
        ? { departamentosCoordinados: { set: departamentoIdsRaw.map((did) => ({ id: did })) } }
        : {}),
    },
  });

  revalidatePath("/dashboard/usuarios");
}

export async function getUserDeleteImpact(id: string) {
  const [tutorias, guardias, material, alumnos] = await Promise.all([
    prisma.tutoria.count({ where: { profesorId: id } }),
    prisma.guardia.count({ where: { profesorId: id } }),
    prisma.materialRequest.count({ where: { profesorId: id } }),
    prisma.alumno.count({ where: { profesorId: id } }),
  ]);
  return { tutorias, guardias, material, alumnos };
}

export async function deleteUser(id: string) {
  if (!id) {
    throw new Error("Falta el identificador del usuario.");
  }

  const session = await getServerSession(authOptions);
  if (session?.user.id === id) {
    throw new Error("No puedes eliminar tu propio usuario mientras tienes la sesión iniciada.");
  }

  const alumnos = await prisma.alumno.findMany({
    where: { profesorId: id },
    select: { id: true },
  });
  const alumnoIds = alumnos.map((a) => a.id);

  // Se borra todo lo asociado, en el orden correcto para no romper claves foráneas.
  if (alumnoIds.length > 0) {
    await prisma.alumnoContacto.deleteMany({ where: { alumnoId: { in: alumnoIds } } });
    // Si alguno de sus alumnos tiene ficha de Prácticas o Incidencias
    // abiertas, hay que borrarlas antes de poder borrar al propio alumno.
    await prisma.practicaAlumno.deleteMany({ where: { alumnoId: { in: alumnoIds } } });
    await prisma.expediente.deleteMany({ where: { alumnoId: { in: alumnoIds } } });
    await prisma.incidencia.deleteMany({ where: { alumnoId: { in: alumnoIds } } });
  }
  await prisma.tutoria.deleteMany({ where: { profesorId: id } });
  await prisma.guardia.deleteMany({ where: { profesorId: id } });
  await prisma.materialRequest.deleteMany({ where: { profesorId: id } });
  await prisma.alumno.deleteMany({ where: { profesorId: id } });
  await prisma.horarioBloque.deleteMany({ where: { profesorId: id } });
  await prisma.calendarEvento.deleteMany({ where: { userId: id } });
  await prisma.aviso.deleteMany({ where: { autorId: id } });

  // Estos módulos se añadieron después de escribir esta función, así que
  // hacía falta sumarlos aquí también (si no, borrar el usuario fallaba por
  // culpa de estas referencias sueltas).
  await prisma.historiaVista.deleteMany({ where: { userId: id } });
  await prisma.historia.deleteMany({ where: { autorId: id } });
  await prisma.salida.deleteMany({ where: { OR: [{ creadoPorId: id }, { responsableId: id }] } });
  await prisma.expediente.deleteMany({ where: { OR: [{ tutorId: id }, { creadoPorId: id }] } });
  await prisma.incidencia.deleteMany({ where: { OR: [{ creadorId: id }, { tutorId: id }] } });
  await prisma.espacioReserva.deleteMany({ where: { OR: [{ userId: id }, { creadoPorId: id }] } });
  await prisma.coberturaGuardia.deleteMany({ where: { OR: [{ profesorAusenteId: id }, { profesorSustitutoId: id }, { creadoPorId: id }] } });

  await prisma.user.delete({ where: { id } });
  revalidatePath("/dashboard/usuarios");
}
