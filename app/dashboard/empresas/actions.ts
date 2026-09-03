"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin, EMPRESAS_DOCUMENTOS_BUCKET } from "@/lib/supabaseAdmin";

function esDirectivo(role?: string) {
  return role === "SUPERADMIN" || role === "DIRECCION" || role === "COORDINADOR" || role === "ADMIN_CENTRO" || role === "ADMINISTRACION";
}

export async function obtenerEmpresas(schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return [];
  const schoolId = schoolIdParam ?? session.user.schoolId;
  if (!schoolId) return [];

  const empresas = await prisma.empresa.findMany({
    where: { schoolId },
    include: { _count: { select: { convenios: true } } },
    orderBy: { nombreComercial: "asc" },
  });

  return empresas.map((e) => ({
    id: e.id,
    nombreComercial: e.nombreComercial,
    razonSocial: e.razonSocial,
    sector: e.sector,
    ciudad: e.ciudad,
    provincia: e.provincia,
    contactoNombre: e.contactoNombre,
    contactoEmail: e.contactoEmail,
    telefono: e.telefono,
    convenioVigente: e.convenioVigente,
    convenioInicio: e.convenioInicio ? e.convenioInicio.toISOString() : null,
    convenioFin: e.convenioFin ? e.convenioFin.toISOString() : null,
    vacantes: e.vacantes,
    ciclosVinculados: e.ciclosVinculados,
    estado: e.estado,
    totalConvenios: e._count.convenios,
    updatedAt: e.updatedAt.toISOString(),
  }));
}

export async function obtenerEmpresa(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.schoolId) return null;

  const e = await prisma.empresa.findUnique({
    where: { id },
    include: {
      documentos: true,
      creadoPor: { select: { name: true, email: true } },
      departamento: { select: { id: true, nombre: true } },
      _count: { select: { convenios: true } },
      historial: { orderBy: { createdAt: "desc" }, take: 30 },
      notasObservaciones: { orderBy: { createdAt: "desc" } },
      convenios: {
        where: { cerrado: false },
        include: { practicaAlumno: { include: { alumno: { select: { nombre: true } } } } },
      },
    },
  });
  if (!e || e.schoolId !== session.user.schoolId) return null;

  return {
    id: e.id,
    razonSocial: e.razonSocial,
    nombreComercial: e.nombreComercial,
    cif: e.cif,
    sector: e.sector,
    departamentoId: e.departamentoId,
    departamentoNombre: e.departamento?.nombre ?? null,
    descripcion: e.descripcion,
    anyoFundacion: e.anyoFundacion,
    numEmpleados: e.numEmpleados,
    tamanoEmpresa: e.tamanoEmpresa,
    tipoEmpresa: e.tipoEmpresa,
    sitioWeb: e.sitioWeb,
    correoCorporativo: e.correoCorporativo,
    contactoNombre: e.contactoNombre,
    contactoCargo: e.contactoCargo,
    contactoEmail: e.contactoEmail,
    contactoEmailsExtra: e.contactoEmailsExtra,
    telefonoDirecto: e.telefonoDirecto,
    telefono: e.telefono,
    direccion: e.direccion,
    codigoPostal: e.codigoPostal,
    ciudad: e.ciudad,
    provincia: e.provincia,
    convenioVigente: e.convenioVigente,
    convenioInicio: e.convenioInicio ? e.convenioInicio.toISOString().slice(0, 10) : null,
    convenioFin: e.convenioFin ? e.convenioFin.toISOString().slice(0, 10) : null,
    renovableAuto: e.renovableAuto,
    vacantes: e.vacantes,
    modalidad: e.modalidad,
    horarioHabitual: e.horarioHabitual,
    ciclosVinculados: e.ciclosVinculados,
    requisitos: e.requisitos,
    observaciones: e.observaciones,
    estado: e.estado,
    totalConvenios: e._count.convenios,
    creadoPorNombre: e.creadoPor ? (e.creadoPor.name ?? e.creadoPor.email) : null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    documentos: e.documentos.map((d) => ({ id: d.id, nombre: d.nombre, url: d.url })),
    historial: e.historial.map((h) => ({
      id: h.id,
      accion: h.accion,
      detalle: h.detalle,
      usuarioNombre: h.usuarioNombre,
      createdAt: h.createdAt.toISOString(),
    })),
    notasObservaciones: e.notasObservaciones.map((n) => ({
      id: n.id,
      texto: n.texto,
      usuarioNombre: n.usuarioNombre,
      createdAt: n.createdAt.toISOString(),
    })),
    alumnosConConvenioActivo: e.convenios.map((c) => ({
      id: c.id,
      practicaAlumnoId: c.practicaAlumnoId,
      alumnoNombre: c.practicaAlumno.alumno.nombre,
      fechaInicio: c.fechaInicio ? c.fechaInicio.toISOString() : null,
      fechaFin: c.fechaFin ? c.fechaFin.toISOString() : null,
    })),
  };
}

function leerCamposEmpresa(formData: FormData) {
  const num = (v: FormDataEntryValue | null) => (v && String(v).trim() ? Number(v) : null);
  const str = (v: FormDataEntryValue | null) => {
    const s = (v as string)?.trim();
    return s ? s : null;
  };
  const fecha = (v: FormDataEntryValue | null) => {
    const s = (v as string)?.trim();
    return s ? new Date(s) : null;
  };

  return {
    razonSocial: (formData.get("razonSocial") as string)?.trim(),
    nombreComercial: (formData.get("nombreComercial") as string)?.trim(),
    cif: str(formData.get("cif")),
    departamentoId: str(formData.get("departamentoId")),
    descripcion: str(formData.get("descripcion")),
    anyoFundacion: num(formData.get("anyoFundacion")),
    numEmpleados: num(formData.get("numEmpleados")),
    tamanoEmpresa: str(formData.get("tamanoEmpresa")),
    tipoEmpresa: str(formData.get("tipoEmpresa")),
    sitioWeb: str(formData.get("sitioWeb")),
    correoCorporativo: str(formData.get("correoCorporativo")),
    contactoNombre: str(formData.get("contactoNombre")),
    contactoCargo: str(formData.get("contactoCargo")),
    contactoEmail: str(formData.get("contactoEmail")),
    contactoEmailsExtra: (formData.getAll("contactoEmailsExtra") as string[]).map((s) => s.trim()).filter(Boolean),
    telefonoDirecto: str(formData.get("telefonoDirecto")),
    telefono: str(formData.get("telefono")),
    direccion: str(formData.get("direccion")),
    codigoPostal: str(formData.get("codigoPostal")),
    ciudad: str(formData.get("ciudad")),
    provincia: str(formData.get("provincia")),
    convenioVigente: formData.get("convenioVigente") === "on",
    convenioInicio: fecha(formData.get("convenioInicio")),
    convenioFin: fecha(formData.get("convenioFin")),
    renovableAuto: formData.get("renovableAuto") === "on",
    vacantes: num(formData.get("vacantes")) ?? 1,
    modalidad: str(formData.get("modalidad")),
    horarioHabitual: str(formData.get("horarioHabitual")),
    ciclosVinculados: formData.getAll("ciclosVinculados") as string[],
    requisitos: str(formData.get("requisitos")),
    observaciones: str(formData.get("observaciones")),
    estado: (formData.get("estado") as string) === "ACTIVO" ? "ACTIVO" : "INACTIVO",
  } as const;
}

export async function crearEmpresa(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !session.user.schoolId || !esDirectivo(session.user.role)) {
    throw new Error("Solo Administración o equipo directivo puede crear empresas.");
  }

  const datos = leerCamposEmpresa(formData);
  if (!datos.razonSocial) throw new Error("La razón social es obligatoria.");
  if (!datos.nombreComercial) throw new Error("El nombre comercial es obligatorio.");

  // "Sector" ahora se deriva del departamento elegido (texto guardado
  // aparte para que el listado/filtro siga funcionando igual que antes).
  const sector = datos.departamentoId
    ? (await prisma.departamento.findUnique({ where: { id: datos.departamentoId }, select: { nombre: true } }))?.nombre ?? null
    : null;

  const usuario = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } });

  const empresa = await prisma.empresa.create({
    data: { ...datos, sector, schoolId: session.user.schoolId, creadoPorId: session.user.id },
  });

  await prisma.empresaHistorial.create({
    data: {
      empresaId: empresa.id,
      accion: "Empresa creada",
      usuarioId: session.user.id,
      usuarioNombre: usuario?.name ?? usuario?.email ?? "—",
    },
  });

  revalidatePath("/dashboard/empresas");
  return empresa.id;
}

export async function actualizarEmpresa(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Administración o equipo directivo puede editar empresas.");
  }

  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa || empresa.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado la empresa.");

  const datos = leerCamposEmpresa(formData);
  if (!datos.razonSocial) throw new Error("La razón social es obligatoria.");
  if (!datos.nombreComercial) throw new Error("El nombre comercial es obligatorio.");

  const sector = datos.departamentoId
    ? (await prisma.departamento.findUnique({ where: { id: datos.departamentoId }, select: { nombre: true } }))?.nombre ?? null
    : null;

  await prisma.empresa.update({ where: { id }, data: { ...datos, sector } });

  const usuario = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } });
  await prisma.empresaHistorial.create({
    data: {
      empresaId: id,
      accion: "Información actualizada",
      usuarioId: session.user.id,
      usuarioNombre: usuario?.name ?? usuario?.email ?? "—",
    },
  });

  revalidatePath("/dashboard/empresas");
  revalidatePath(`/dashboard/empresas/${id}`);
}

// Antes de borrar, el que confirma tiene que haber escrito exactamente
// "Eliminar " + el nombre de la empresa — así no se elimina nada sin
// querer con un solo clic.
export async function eliminarEmpresa(id: string, textoConfirmacion: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Administración o equipo directivo puede eliminar empresas.");
  }

  const empresa = await prisma.empresa.findUnique({ where: { id } });
  if (!empresa || empresa.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado la empresa.");

  const esperado = `Eliminar ${empresa.nombreComercial}`;
  if (textoConfirmacion.trim() !== esperado) {
    throw new Error(`Para confirmar, escribe exactamente: ${esperado}`);
  }

  // Al borrar la empresa se van con ella su convenio (vive en la misma
  // fila) y sus documentos adjuntos (relación en cascada) — no toca nada
  // del módulo de Prácticas.
  await prisma.empresa.delete({ where: { id } });

  revalidatePath("/dashboard/empresas");
}

// Para el selector de empresa dentro del formulario de Convenio (módulo
// Prácticas): solo las empresas del centro vinculadas a ese ciclo.
// Compara ciclos ignorando el "1"/"2" del año, mayúsculas y acentos — así
// "CFGM Actividades Comerciales 1" (el ciclo real, con año) encaja con
// "CFGM Actividades Comerciales" (como se guardó al importar las empresas,
// sin año, ya que una empresa vale para el ciclo entero, no un año en
// concreto).
function normalizarCiclo(nombre: string) {
  return nombre
    .replace(/\s*\d+\s*$/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function obtenerEmpresasPorCiclo(ciclo: string, schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return [];
  const schoolId = schoolIdParam ?? session.user.schoolId;
  if (!schoolId || !ciclo) return [];

  const todas = await prisma.empresa.findMany({
    where: { schoolId },
    orderBy: { nombreComercial: "asc" },
  });

  const cicloBuscado = normalizarCiclo(ciclo);
  const empresas = todas.filter((e) => e.ciclosVinculados.some((c) => normalizarCiclo(c) === cicloBuscado));

  return empresas.map((e) => ({
    id: e.id,
    nombreComercial: e.nombreComercial,
    cif: e.cif,
    contactoNombre: e.contactoNombre,
    telefonoDirecto: e.telefonoDirecto,
    telefono: e.telefono,
    contactoEmail: e.contactoEmail,
  }));
}

// Subir un documento a la ficha de la empresa (PDF/JPG/PNG/DOC/DOCX).
export async function subirDocumentoEmpresa(empresaId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Administración o equipo directivo puede subir documentos.");
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa || empresa.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado la empresa.");

  const file = formData.get("documento") as File | null;
  if (!file || file.size === 0) throw new Error("No se ha seleccionado ningún archivo.");
  const tiposPermitidos = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (!tiposPermitidos.includes(file.type)) {
    throw new Error("El documento debe ser un PDF, JPG, PNG, DOC o DOCX.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("El archivo no puede pesar más de 10 MB.");
  }

  const supabase = getSupabaseAdmin();
  const ext = file.name.split(".").pop() || "pdf";
  const path = `${empresa.schoolId}/${empresaId}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(EMPRESAS_DOCUMENTOS_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });
  if (uploadError) throw new Error(`No se pudo subir el documento: ${uploadError.message}`);

  const { data } = supabase.storage.from(EMPRESAS_DOCUMENTOS_BUCKET).getPublicUrl(path);

  await prisma.empresaDocumento.create({
    data: { empresaId, nombre: file.name, url: data.publicUrl },
  });

  const usuario = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } });
  await prisma.empresaHistorial.create({
    data: {
      empresaId,
      accion: "Documento subido",
      detalle: file.name,
      usuarioId: session.user.id,
      usuarioNombre: usuario?.name ?? usuario?.email ?? "—",
    },
  });

  revalidatePath(`/dashboard/empresas/${empresaId}`);
}

export async function eliminarDocumentoEmpresa(documentoId: string, empresaId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id || !esDirectivo(session.user.role)) {
    throw new Error("Solo Administración o equipo directivo puede eliminar documentos.");
  }
  await prisma.empresaDocumento.delete({ where: { id: documentoId } });
  revalidatePath(`/dashboard/empresas/${empresaId}`);
}

// Añade una nota nueva al hilo de observaciones (no borra las anteriores),
// con quién la escribe y cuándo.
export async function anadirObservacionEmpresa(empresaId: string, texto: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");
  if (!texto.trim()) throw new Error("Escribe algo antes de guardar.");

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa || empresa.schoolId !== session.user.schoolId) throw new Error("No se ha encontrado la empresa.");

  const usuario = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } });

  await prisma.empresaObservacion.create({
    data: {
      empresaId,
      texto: texto.trim(),
      usuarioId: session.user.id,
      usuarioNombre: usuario?.name ?? usuario?.email ?? "—",
    },
  });

  revalidatePath(`/dashboard/empresas/${empresaId}`);
}

// Departamentos del centro, para el desplegable de "Departamento" en el
// formulario de empresa (sustituye al antiguo campo de texto "Sector").
export async function obtenerDepartamentosParaEmpresa(schoolIdParam?: string) {
  const session = await getServerSession(authOptions);
  const schoolId = schoolIdParam ?? session?.user.schoolId;
  if (!schoolId) return [];
  const departamentos = await prisma.departamento.findMany({
    where: { schoolId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  return departamentos;
}
