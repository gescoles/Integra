import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../../components/DashboardHeader";
import { DepartamentosAdminClient } from "./DepartamentosAdminClient";
import { obtenerDepartamentos, obtenerCiclosDeCentro } from "../../usuarios/departamentosActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DepartamentosAdminPage({
  searchParams,
}: {
  searchParams: { school?: string };
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "PROFESOR";
  const userName = session?.user.name || session?.user.email.split("@")[0] || "Usuario";

  if (role !== "SUPERADMIN") redirect("/dashboard");

  const schools = await prisma.school.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const schoolId = searchParams.school ?? schools[0]?.id ?? null;

  const [departamentos, ciclosDelCentro] = schoolId
    ? await Promise.all([obtenerDepartamentos(schoolId), obtenerCiclosDeCentro(schoolId)])
    : [[], []];

  return (
    <div>
      <DashboardHeader
        title="Departamentos y ciclos formativos"
        subtitle="Vincula cada departamento con sus ciclos formativos — así, al crear un convenio en Prácticas, solo saldrán los ciclos de cada departamento."
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <DepartamentosAdminClient
        schools={schools}
        schoolId={schoolId}
        departamentos={departamentos}
        ciclosDelCentro={ciclosDelCentro}
      />
    </div>
  );
}
