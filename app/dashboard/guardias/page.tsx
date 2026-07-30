import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { GuardiasClient } from "./GuardiasClient";

export default async function GuardiasPage() {
  const session = await getServerSession(authOptions);
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "COORDINADOR";
  const schoolId = session?.user.schoolId ?? null;

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader
          title="Guardias"
          subtitle="Planifica y consulta las guardias de tu centro."
          userName={userName}
          role={role}
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Tu usuario no tiene un centro asignado todavía.
        </div>
      </div>
    );
  }

  const [guardiasRaw, profesoresRaw] = await Promise.all([
    prisma.guardia.findMany({
      where: { schoolId },
      include: { profesor: { select: { id: true, name: true } } },
      orderBy: { fecha: "desc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = guardiasRaw.map((g) => ({
    id: g.id,
    turno: g.turno,
    ubicacion: g.ubicacion,
    status: g.status,
    fecha: g.fecha.toISOString(),
    profesorId: g.profesorId,
    profesorName: g.profesor?.name ?? "—",
  }));

  const profesores = profesoresRaw.map((p) => ({
    id: p.id,
    name: p.name ?? p.email,
  }));

  return (
    <div>
      <DashboardHeader
        title="Guardias"
        subtitle="Planifica y consulta las guardias de tu centro."
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <GuardiasClient rows={rows} profesores={profesores} />
    </div>
  );
}
