import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { GruposClient } from "./GruposClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GruposPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role;
  const userName = session?.user.name || session?.user.email?.split("@")[0] || "Usuario";

  if (role !== "COORDINADOR" && role !== "ADMIN_CENTRO" && role !== "ADMINISTRACION" && role !== "DIRECCION") {
    redirect("/dashboard");
  }
  if (!session?.user.schoolId) {
    redirect("/dashboard");
  }

  const school = await prisma.school.findUnique({
    where: { id: session.user.schoolId },
    select: { grupos: true },
  });

  return (
    <div>
      <DashboardHeader
        title="Grupos"
        subtitle="Los cursos y grupos del centro que aparecen al crear un alumno, una salida o una petición de material."
        userName={userName}
        role={role}
      />
      <GruposClient grupos={school?.grupos ?? []} />
    </div>
  );
}
