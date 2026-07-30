import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { HorarioClient } from "./HorarioClient";

export default async function HorarioPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user.id) {
    return null;
  }

  const bloques = await prisma.horarioBloque.findMany({
    where: { profesorId: session.user.id },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  });

  return (
    <div>
      <DashboardHeader
        title="Mi horario"
        subtitle="Organiza tu horario semanal de clases."
        notificationCount={0}
      />
      <HorarioClient bloques={bloques} />
    </div>
  );
}
