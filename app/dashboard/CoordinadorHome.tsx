import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardHeader } from "./components/DashboardHeader";
import { LockedCard } from "./components/LockedCard";
import { CoordinadorAgenda } from "./components/CoordinadorAgenda";
import { Calendar, ShieldCheck, FolderOpen, ArrowRight } from "lucide-react";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function CoordinadorHome({
  userName,
  role,
  schoolId,
}: {
  userName: string;
  role: string;
  schoolId: string | null;
}) {
  if (!schoolId) {
    return (
      <div>
        <DashboardHeader
          title="Panel general"
          subtitle={`Bienvenido, ${userName}.`}
          userName={userName}
          role={role}
          notificationCount={0}
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Tu usuario todavía no tiene un centro asignado. Pide a tu SuperAdmin
          que te asocie a un centro para ver los datos aquí.
        </div>
      </div>
    );
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { modules: true },
  });
  const modules = school?.modules ?? [];
  const hasTutorias = modules.includes("tutorias");
  const hasGuardias = modules.includes("guardias");
  const hasMaterial = modules.includes("material");

  if (!hasTutorias && !hasGuardias && !hasMaterial) {
    return (
      <div>
        <DashboardHeader
          title="Panel general"
          subtitle={`Bienvenido, ${userName}. Aquí tienes el resumen del centro.`}
          userName={userName}
          role={role}
          notificationCount={0}
        />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
          <h2 className="text-lg font-semibold text-slate-500">
            Tu centro todavía no tiene módulos contratados
          </h2>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            Habla con tu SuperAdmin para activar Tutorías, Guardias o Material.
          </p>
        </div>
      </div>
    );
  }

  const hoy = startOfToday();
  const finHoy = endOfToday();

  const [
    tutoriasHoy,
    guardiasAsignadas,
    materialPendiente,
    tutoriasHoyList,
    guardiasHoyList,
    profesoresRaw,
  ] = await Promise.all([
    hasTutorias
      ? prisma.tutoria.count({ where: { schoolId, sessionDate: { gte: hoy, lte: finHoy } } })
      : Promise.resolve(0),
    hasGuardias
      ? prisma.guardia.count({ where: { schoolId, status: { in: ["PROGRAMADA", "PENDIENTE"] } } })
      : Promise.resolve(0),
    hasMaterial
      ? prisma.materialRequest.count({ where: { schoolId, status: { not: "APROBADO" } } })
      : Promise.resolve(0),
    hasTutorias
      ? prisma.tutoria.findMany({
          where: { schoolId, sessionDate: { gte: hoy, lte: finHoy } },
          include: { profesor: { select: { id: true, name: true } } },
          orderBy: { sessionDate: "asc" },
        })
      : Promise.resolve([]),
    hasGuardias
      ? prisma.guardia.findMany({
          where: { schoolId, fecha: { gte: hoy, lte: finHoy } },
          include: { profesor: { select: { id: true, name: true } } },
          orderBy: { fecha: "asc" },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const profesores = profesoresRaw.map((p) => ({ id: p.id, name: p.name ?? p.email }));

  const agenda = [
    ...tutoriasHoyList.map((t) => ({
      id: `tutoria-${t.id}`,
      time: t.sessionDate.toISOString(),
      title: `Tutoría · ${t.studentName}`,
      subtitle: t.cicloModulo ?? "",
      profesorId: t.profesorId,
      profesorName: t.profesor?.name ?? "—",
      color: "bg-violet-500",
    })),
    ...guardiasHoyList.map((g) => ({
      id: `guardia-${g.id}`,
      time: g.fecha.toISOString(),
      title: g.turno,
      subtitle: g.ubicacion ?? "",
      profesorId: g.profesorId,
      profesorName: g.profesor?.name ?? "—",
      color: "bg-blue-500",
    })),
  ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div>
      <DashboardHeader
        title={`¡Bienvenido, ${userName}!`}
        subtitle="Aquí tienes el resumen de la actividad de todo el centro."
        userName={userName}
        role={role}
        notificationCount={agenda.length}
      />

      {/* Stats — todo el centro */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hasTutorias ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div className="mt-3 text-xs text-slate-500">Tutorías hoy (centro)</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{tutoriasHoy}</div>
            <Link
              href="/dashboard/tutorias"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <LockedCard title="Tutorías hoy" moduleName="Tutorías" />
        )}

        {hasGuardias ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
              <ShieldCheck className="h-5 w-5 text-violet-600" />
            </div>
            <div className="mt-3 text-xs text-slate-500">Guardias asignadas (centro)</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{guardiasAsignadas}</div>
            <Link
              href="/dashboard/guardias"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <LockedCard title="Guardias asignadas" moduleName="Guardias" />
        )}

        {hasMaterial ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <FolderOpen className="h-5 w-5 text-[#2F6FED]" />
            </div>
            <div className="mt-3 text-xs text-slate-500">Material pendiente (centro)</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{materialPendiente}</div>
            <Link
              href="/dashboard/material"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <LockedCard title="Material pendiente" moduleName="Material" />
        )}
      </div>

      {/* Agenda de hoy — todo el centro, con filtro por profesor */}
      <div className="mt-5">
        <CoordinadorAgenda items={agenda} profesores={profesores} />
      </div>
    </div>
  );
}
