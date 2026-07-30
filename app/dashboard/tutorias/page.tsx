import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { TutoriasClient } from "./TutoriasClient";

export default async function TutoriasPage() {
  const session = await getServerSession(authOptions);
  const userName =
    session?.user.name || session?.user.email.split("@")[0] || "Usuario";
  const role = session?.user.role ?? "COORDINADOR";
  const schoolId = session?.user.schoolId ?? null;

  if (!schoolId) {
    return (
      <div>
        <DashboardHeader
          title="Tutorías"
          subtitle="Gestiona las tutorías de tu centro."
          userName={userName}
          role={role}
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Tu usuario no tiene un centro asignado todavía.
        </div>
      </div>
    );
  }

  const [tutoriasRaw, profesoresRaw] = await Promise.all([
    prisma.tutoria.findMany({
      where: { schoolId },
      include: { profesor: { select: { id: true, name: true } } },
      orderBy: { sessionDate: "desc" },
    }),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = tutoriasRaw.map((t) => ({
    id: t.id,
    studentName: t.studentName,
    cicloModulo: t.cicloModulo,
    status: t.status,
    sessionDate: t.sessionDate.toISOString(),
    profesorId: t.profesorId,
    profesorName: t.profesor?.name ?? "—",
  }));

  const profesores = profesoresRaw.map((p) => ({
    id: p.id,
    name: p.name ?? p.email,
  }));

  return (
    <div>
      <DashboardHeader
        title="Tutorías"
        subtitle="Gestiona las tutorías de tu centro."
        userName={userName}
        role={role}
        notificationCount={0}
      />
      <TutoriasClient rows={rows} profesores={profesores} />
    </div>
  );
}
