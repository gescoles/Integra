"use server";

import { sendSolicitudCentroEmail } from "@/lib/email";

export async function enviarSolicitud(formData: FormData) {
  const tipo = (formData.get("tipo") as string) === "registro" ? "registro" : "demo";
  const centro = (formData.get("centro") as string)?.trim();
  const responsable = (formData.get("responsable") as string)?.trim();
  const cargo = (formData.get("cargo") as string)?.trim();
  const telefono = (formData.get("telefono") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const numAlumnos = (formData.get("numAlumnos") as string)?.trim();
  const mensaje = (formData.get("mensaje") as string)?.trim();

  if (!centro) throw new Error("El nombre del centro es obligatorio.");
  if (!responsable) throw new Error("El nombre del responsable es obligatorio.");
  if (!cargo) throw new Error("El cargo es obligatorio.");
  if (!telefono) throw new Error("El teléfono es obligatorio.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("El email no es válido.");

  await sendSolicitudCentroEmail({
    tipo,
    centro,
    responsable,
    cargo,
    telefono,
    email,
    numAlumnos: numAlumnos || undefined,
    mensaje: mensaje || undefined,
  });
}
