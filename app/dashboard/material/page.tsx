import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { MaterialClient } from "./MaterialClient";

export default async function MaterialPage() {
  const session = await getServerSession(authOptions);
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "COORDINADOR";
  const schoolId = session?.user.schoolId ?? null;

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader
          title="Material"
          subtitle="Solicitudes de material didáctico del centro."
          userName={userName}
          role={role}
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Tu usuario no tiene un centro asignado todavía.
        </div>
      </div>
    );
  }

  const [materialRaw, profesoresRaw] = await Promise.all([
    prisma.materialRequest.findMany({
      where: { schoolId },
      include: { profesor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = materialRaw.map((m) => ({
    id: m.id,
    materialName: m.materialName,
    cicloModulo: m.cicloModulo,
    cantidad: m.cantidad,
    prioridad: m.prioridad,
    costeEstimado: m.costeEstimado,
    status: m.status,
    profesorId: m.profesorId,
    profesorName: m.profesor?.name ?? "—",
  }));

  const profesores = profesoresRaw.map((p) => ({
    id: p.id,
    name: p.name ?? p.email,
  }));

  return (
    <div>
      <DashboardHeader
        title="Material"
        subtitle="Solicitudes de material didáctico del centro."
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <MaterialClient rows={rows} profesores={profesores} />
    </div>
  );
}
