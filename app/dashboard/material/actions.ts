"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { MaterialStatus } from "@prisma/client";

export async function updateMaterialStatus(id: string, status: MaterialStatus) {
  await prisma.materialRequest.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/material");
  revalidatePath("/dashboard");
}
