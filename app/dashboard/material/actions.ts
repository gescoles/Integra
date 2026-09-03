"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MaterialCategoria } from "@prisma/client";
import { notifyUsers } from "@/lib/notifications";
import { sendMaterialNuevoEmail, sendMaterialValidadoEmail, sendMaterialParaComprarEmail, sendMaterialCompradoEmail, sendMaterialModificadoEmail, sendMaterialEliminadoEmail } from "@/lib/email";

// Acceso amplio de equipo directivo (editar/eliminar cualquier solicitud):
// incluye a Dirección, que además tiene sus propios permisos exclusivos.
function esAdministracion(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

// Validar un material (decidir si se aprueba la compra): exclusivo de
// Dirección y SuperAdmin.
function esDireccion(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION";
}

// Marcarlo como comprado, una vez llega de verdad al centro: exclusivo
// del rol Administración (y SuperAdmin) — ni Dirección ni el resto del
// equipo directivo lo hacen, porque es Administración quien gestiona la
// compra física.
function esSoloAdministracion(role?: string) {
  return role === "SUPERADMIN" || role === "ADMINISTRACION";
}

export async function createMaterial(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId) throw new Error("No autorizado.");

  const nombre = (formData.get("nombre") as string)?.trim();
  const curso = (formData.get("curso") as string)?.trim();
  const asignatura = (formData.get("asignatura") as string)?.trim();
  const cantidadRaw = formData.get("cantidad") as string;
  const precioUnidadRaw = formData.get("precioUnidad") as string;
  const proveedor = (formData.get("proveedor") as string)?.trim();
  const enlace = (formData.get("enlace") as string)?.trim();
  const justificacion = (formData.get("justificacion") as string)?.trim();
  const categoria = (formData.get("categoria") as MaterialCategoria) || "OTROS";

  if (!nombre) throw new Error("El nombre del material es obligatorio.");
  if (!curso) throw new Error("El curso es obligatorio.");
  if (!asignatura) throw new Error("La asignatura es obligatoria.");
  if (!cantidadRaw) throw new Error("La cantidad es obligatoria.");
  if (!precioUnidadRaw) throw new Error("El precio por unidad es obligatorio.");
  if (!proveedor) throw new Error("El proveedor es obligatorio.");
  if (!enlace) throw new Error("El enlace donde comprarlo es obligatorio.");
  if (!justificacion) throw new Error("Explica por qué es necesario este material.");

  const cantidad = Number(cantidadRaw) || 1;
  const precioUnidad = Number(precioUnidadRaw) || 0;

  const material = await prisma.materialRequest.create({
    data: {
      schoolId: session.user.schoolId,
      profesorId: session.user.id,
      nombre,
      curso,
      asignatura,
      cantidad,
      precioUnidad,
      proveedor,
      enlace,
      justificacion,
      categoria,
    },
  });

  // Ahora la solicitud llega primero a Dirección: es quien decide si se
  // aprueba, así que es la única que recibe tanto la notificación dentro
  // de la app como el correo de "nueva solicitud". Administración solo se
  // entera cuando Dirección aprueba (ver validarMaterial), no antes.
  try {
    const [creador, direccion] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
      prisma.user.findMany({
        where: { schoolId: session.user.schoolId, role: "DIRECCION" },
        select: { id: true, name: true, email: true },
      }),
    ]);
    const creadorNombre = creador?.name ?? creador?.email ?? "Un profesor";

    await notifyUsers(
      direccion.map((a) => a.id),
      {
        schoolId: session.user.schoolId,
        tipo: "MATERIAL_NUEVO",
        titulo: "Nueva solicitud de material",
        mensaje: `${creadorNombre} ha pedido "${nombre}" (${curso}) — pendiente de validar.`,
        link: "/dashboard/material",
        relatedId: material.id,
      }
    );

    await Promise.all(
      direccion.map((a) =>
        sendMaterialNuevoEmail({
          to: a.email,
          adminNombre: a.name ?? a.email,
          profesorNombre: creadorNombre,
          nombreMaterial: nombre,
          curso,
          cantidad,
          precioUnidad,
        })
      )
    );
  } catch {
    // El material ya se ha guardado; si el aviso falla no lo bloqueamos.
  }

  revalidatePath("/dashboard/material");
  revalidatePath("/dashboard");
}

export async function validarMaterial(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDireccion(session.user.role)) {
    throw new Error("Solo Dirección o SuperAdmin puede validar un material.");
  }

  const material = await prisma.materialRequest.findUnique({
    where: { id },
    include: { profesor: { select: { name: true, email: true } } },
  });
  if (!material || material.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el material.");
  if (material.estado !== "PENDIENTE_VALIDACION") throw new Error("Este material ya no está pendiente de validar.");

  await prisma.materialRequest.update({
    where: { id },
    data: { estado: "VALIDADO_PENDIENTE_COMPRA", validadoPorId: session.user.id, validadoEn: new Date() },
  });

  try {
    await notifyUsers([material.profesorId], {
      schoolId: material.schoolId,
      tipo: "MATERIAL_VALIDADO",
      titulo: "Material aprobado",
      mensaje: `"${material.nombre}" ha sido aprobado y está en curso de compra.`,
      link: "/dashboard/material",
      relatedId: material.id,
    });

    if (material.profesor.email) {
      await sendMaterialValidadoEmail({
        to: material.profesor.email,
        profesorNombre: material.profesor.name ?? material.profesor.email,
        nombreMaterial: material.nombre,
      });
    }

    // Dirección ya lo ha aprobado: ahora le toca a Administración comprarlo
    // de verdad, así que es quien recibe el aviso (dentro de la app y por
    // correo) de que ya puede pasar a la compra.
    const administracion = await prisma.user.findMany({
      where: { schoolId: material.schoolId, role: "ADMINISTRACION" },
      select: { id: true, name: true, email: true },
    });
    const profesorNombre = material.profesor.name ?? material.profesor.email;

    // Tipo propio (no "MATERIAL_NUEVO") para poder distinguir este aviso
    // del resto en la pantalla principal, y poder hacerlo desaparecer de
    // ahí en cuanto Administración le da clic — sin tocar el resto de
    // notificaciones ni la propia solicitud, que sigue viéndose en Material
    // hasta que se compre de verdad.
    await notifyUsers(
      administracion.map((a) => a.id),
      {
        schoolId: material.schoolId,
        tipo: "MATERIAL_PENDIENTE_COMPRAR",
        titulo: "Material aprobado, pendiente de comprar",
        mensaje: `Dirección ha aprobado "${material.nombre}" (${profesorNombre}) — ya puedes comprarlo.`,
        link: "/dashboard/material",
        relatedId: material.id,
      }
    );

    await Promise.all(
      administracion.map((a) =>
        sendMaterialParaComprarEmail({
          to: a.email,
          adminNombre: a.name ?? a.email,
          profesorNombre,
          nombreMaterial: material.nombre,
          curso: material.curso,
          cantidad: material.cantidad,
          precioUnidad: material.precioUnidad,
        })
      )
    );
  } catch {
    // Ya se ha validado; si el aviso falla no lo bloqueamos.
  }

  revalidatePath("/dashboard/material");
  revalidatePath("/dashboard");
}

export async function marcarMaterialComprado(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esSoloAdministracion(session.user.role)) {
    throw new Error("Solo Administración puede marcar un material como comprado.");
  }

  const material = await prisma.materialRequest.findUnique({
    where: { id },
    include: { profesor: { select: { name: true, email: true } } },
  });
  if (!material || material.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado el material.");
  if (material.estado !== "VALIDADO_PENDIENTE_COMPRA") {
    throw new Error("Este material todavía no está validado, o ya se marcó como comprado.");
  }

  await prisma.materialRequest.update({
    where: { id },
    data: { estado: "COMPRADO", compradoPorId: session.user.id, compradoEn: new Date() },
  });

  try {
    await notifyUsers([material.profesorId], {
      schoolId: material.schoolId,
      tipo: "MATERIAL_COMPRADO",
      titulo: "Ya puedes recoger tu material",
      mensaje: `"${material.nombre}" ya ha llegado — pasa a recogerlo por secretaría.`,
      link: "/dashboard/material",
      relatedId: material.id,
    });

    if (material.profesor.email) {
      await sendMaterialCompradoEmail({
        to: material.profesor.email,
        profesorNombre: material.profesor.name ?? material.profesor.email,
        nombreMaterial: material.nombre,
      });
    }
  } catch {
    // Ya se ha marcado comprado; si el aviso falla no lo bloqueamos.
  }

  revalidatePath("/dashboard/material");
  revalidatePath("/dashboard");
}

export async function updateMaterial(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const id = formData.get("id") as string;
  const material = await prisma.materialRequest.findUnique({ where: { id } });
  const canManageAll =
    session.user.role === "SUPERADMIN" ||
    ((session.user.role === "DIRECCION" || session.user.role === "COORDINADOR" || session.user.role === "ADMIN_CENTRO" || session.user.role === "ADMINISTRACION") &&
      material?.schoolId === session.user.schoolId);
  if (!material || (material.profesorId !== session.user.id && !canManageAll)) {
    throw new Error("No puedes editar un material que no has pedido tú.");
  }

  const nombre = (formData.get("nombre") as string)?.trim();
  const curso = (formData.get("curso") as string)?.trim();
  const asignatura = (formData.get("asignatura") as string)?.trim();
  const cantidadRaw = formData.get("cantidad") as string;
  const precioUnidadRaw = formData.get("precioUnidad") as string;
  const proveedor = (formData.get("proveedor") as string)?.trim();
  const enlace = (formData.get("enlace") as string)?.trim();
  const justificacion = (formData.get("justificacion") as string)?.trim();
  const categoria = (formData.get("categoria") as MaterialCategoria) || "OTROS";

  if (!nombre) throw new Error("El nombre del material es obligatorio.");
  if (!curso) throw new Error("El curso es obligatorio.");
  if (!asignatura) throw new Error("La asignatura es obligatoria.");
  if (!cantidadRaw) throw new Error("La cantidad es obligatoria.");
  if (!precioUnidadRaw) throw new Error("El precio por unidad es obligatorio.");
  if (!proveedor) throw new Error("El proveedor es obligatorio.");
  if (!enlace) throw new Error("El enlace donde comprarlo es obligatorio.");
  if (!justificacion) throw new Error("Explica por qué es necesario este material.");

  await prisma.materialRequest.update({
    where: { id },
    data: {
      nombre,
      curso,
      asignatura,
      cantidad: Number(cantidadRaw) || 1,
      precioUnidad: Number(precioUnidadRaw) || 0,
      proveedor,
      enlace,
      justificacion,
      categoria,
    },
  });

  // Si quien edita no es el propio profesor que lo pidió (es decir, es
  // Administración o equipo directivo tocando la solicitud de otro),
  // avisamos al dueño de que se ha modificado.
  if (material.profesorId !== session.user.id) {
    try {
      const [autorEdicion, dueño] = await Promise.all([
        prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
        prisma.user.findUnique({ where: { id: material.profesorId }, select: { name: true, email: true } }),
      ]);
      const autorNombre = autorEdicion?.name ?? autorEdicion?.email ?? "Administración";

      if (dueño) {
        await notifyUsers([material.profesorId], {
          schoolId: material.schoolId,
          tipo: "MATERIAL_MODIFICADO",
          titulo: "Tu material ha sido modificado",
          mensaje: `${autorNombre} ha modificado "${nombre}".`,
          link: "/dashboard/material",
          relatedId: id,
        });
        if (dueño.email) {
          await sendMaterialModificadoEmail({
            to: dueño.email,
            profesorNombre: dueño.name ?? dueño.email,
            nombreMaterial: nombre,
            modificadoPorNombre: autorNombre,
          });
        }
      }
    } catch {
      // El material ya se ha actualizado; si el aviso falla no lo bloqueamos.
    }
  }

  revalidatePath("/dashboard/material");
  revalidatePath("/dashboard");
}

export async function deleteMaterial(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const material = await prisma.materialRequest.findUnique({ where: { id } });
  const canManageAll =
    session.user.role === "SUPERADMIN" ||
    ((session.user.role === "DIRECCION" || session.user.role === "COORDINADOR" || session.user.role === "ADMIN_CENTRO" || session.user.role === "ADMINISTRACION") &&
      material?.schoolId === session.user.schoolId);
  if (!material || (material.profesorId !== session.user.id && !canManageAll)) {
    throw new Error("No puedes eliminar un material que no es tuyo.");
  }

  // Si quien borra no es el propio profesor que lo pidió, avisamos al
  // dueño ANTES de borrar de verdad — después ya no tendríamos sus datos.
  const avisarADueño = material.profesorId !== session.user.id;
  let datosParaAviso: { email: string; nombre: string; autorNombre: string } | null = null;

  if (avisarADueño) {
    try {
      const [autorBorrado, dueño] = await Promise.all([
        prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } }),
        prisma.user.findUnique({ where: { id: material.profesorId }, select: { name: true, email: true } }),
      ]);
      if (dueño?.email) {
        datosParaAviso = {
          email: dueño.email,
          nombre: dueño.name ?? dueño.email,
          autorNombre: autorBorrado?.name ?? autorBorrado?.email ?? "Administración",
        };
      }
    } catch {
      // Si no se pueden obtener los datos, seguimos con el borrado igual.
    }
  }

  await prisma.materialRequest.delete({ where: { id } });

  if (datosParaAviso) {
    try {
      await notifyUsers([material.profesorId], {
        schoolId: material.schoolId,
        tipo: "MATERIAL_ELIMINADO",
        titulo: "Tu material ha sido eliminado",
        mensaje: `${datosParaAviso.autorNombre} ha eliminado tu solicitud "${material.nombre}".`,
        link: "/dashboard/material",
      });
      await sendMaterialEliminadoEmail({
        to: datosParaAviso.email,
        profesorNombre: datosParaAviso.nombre,
        nombreMaterial: material.nombre,
        eliminadoPorNombre: datosParaAviso.autorNombre,
      });
    } catch {
      // El material ya se ha borrado; si el aviso falla no lo bloqueamos.
    }
  }

  revalidatePath("/dashboard/material");
  revalidatePath("/dashboard");
}
