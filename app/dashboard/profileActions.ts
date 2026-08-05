"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin, USER_AVATARS_BUCKET } from "@/lib/supabaseAdmin";

export async function uploadMyAvatar(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) throw new Error("No autorizado.");

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) throw new Error("No se ha seleccionado ninguna imagen.");
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen (JPG, PNG, WEBP...).");
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error("La imagen no puede pesar más de 3 MB.");
  }

  const supabase = getSupabaseAdmin();
  const ext = file.name.split(".").pop() || "png";
  // Cada foto lleva la fecha en el nombre para evitar problemas de caché del
  // navegador al cambiarla; las fotos viejas del mismo usuario se quedan en
  // el bucket (ocupan poco) pero dejan de estar enlazadas desde su perfil.
  const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(USER_AVATARS_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`No se pudo subir la imagen: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(USER_AVATARS_BUCKET).getPublicUrl(path);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: data.publicUrl },
  });

  revalidatePath("/dashboard");

  return data.publicUrl;
}
