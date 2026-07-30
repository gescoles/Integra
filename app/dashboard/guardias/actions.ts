"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { GuardiaStatus } from "@prisma/client";

export async function updateGuardiaStatus(id: string, status: GuardiaStatus) {
  await prisma.guardia.update({ where: { id }, data: { status } });
  revalidatePath("/dashboard/guardias");
  revalidatePath("/dashboard");
}
