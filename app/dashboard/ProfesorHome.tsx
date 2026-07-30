import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "./components/DashboardHeader";
import { LockedCard } from "./components/LockedCard";
import { CalendarWeekPreview } from "./components/CalendarWeekPreview";
import { Calendar, ShieldCheck, FolderOpen, ArrowRight, Briefcase } from "lucide-react";

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

export async function ProfesorHome({
  userId,
  userName,
  role,
  schoolId,
}: {
  userId: string;
  userName: string;
  role: string;
  schoolId: string | null;
}) {
  if (!schoolId) {
    return (
      <div>
        <DashboardHeader
          title={`¡Bienvenido, ${userName}!`}
          subtitle="Aquí tienes tus actividades y recursos para hoy."
          userName={userName}
          role={role}
          notificationCount={0}
        />
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          Tu usuario todavía no tiene un centro asignado. Pide a tu SuperAdmin
          que te asocie a un centro para ver tus datos aquí.
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

  const hoy = startOfToday();
  const finHoy = endOfToday();

  const [tutoriasHoy, guardiasAsignadas, materialPendiente, tutoriasHoyList, guardiasHoyList] =
    await Promise.all([
      hasTutorias
        ? prisma.tutoria.count({
            where: { profesorId: userId, sessionDate: { gte: hoy, lte: finHoy } },
          })
        : Promise.resolve(0),
      hasGuardias
        ? prisma.guardia.count({
            where: { profesorId: userId, status: { in: ["PROGRAMADA", "PENDIENTE"] } },
          })
        : Promise.resolve(0),
      hasMaterial
        ? prisma.materialRequest.count({
            where: { profesorId: userId, status: { not: "APROBADO" } },
          })
        : Promise.resolve(0),
      hasTutorias
        ? prisma.tutoria.findMany({
            where: { profesorId: userId, sessionDate: { gte: hoy, lte: finHoy } },
            orderBy: { sessionDate: "asc" },
          })
        : Promise.resolve([]),
      hasGuardias
        ? prisma.guardia.findMany({
            where: { profesorId: userId, fecha: { gte: hoy, lte: finHoy } },
            orderBy: { fecha: "asc" },
          })
        : Promise.resolve([]),
    ]);

  // Agenda de hoy: tutorías + guardias de hoy, combinadas y ordenadas por hora
  const agenda = [
    ...tutoriasHoyList.map((t) => ({
      id: `tutoria-${t.id}`,
      time: t.sessionDate,
      title: `Tutoría · ${t.studentName}`,
      subtitle: t.cicloModulo ?? "",
      color: "bg-violet-500",
    })),
    ...guardiasHoyList.map((g) => ({
      id: `guardia-${g.id}`,
      time: g.fecha,
      title: g.turno,
      subtitle: g.ubicacion ?? "",
      color: "bg-blue-500",
    })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  return (
    <div>
      <DashboardHeader
        title={`¡Bienvenido, ${userName}!`}
        subtitle="Aquí tienes tus actividades y recursos para hoy."
        userName={userName}
        role={role}
        notificationCount={agenda.length}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hasTutorias ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div className="mt-3 text-xs text-slate-500">Tutorías hoy</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{tutoriasHoy}</div>
            <Link
              href="/dashboard/tutorias"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
            >
              Ver agenda <ArrowRight className="h-3 w-3" />
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
            <div className="mt-3 text-xs text-slate-500">Guardias asignadas</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{guardiasAsignadas}</div>
            <Link
              href="/dashboard/guardias"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
            >
              Ver guardias <ArrowRight className="h-3 w-3" />
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
            <div className="mt-3 text-xs text-slate-500">Material pendiente</div>
            <div className="text-2xl font-bold text-[#0B1D4D]">{materialPendiente}</div>
            <Link
              href="/dashboard/material"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
            >
              Ver pendientes <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <LockedCard title="Material pendiente" moduleName="Material" />
        )}
      </div>

      {/* Agenda de hoy */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-[#0B1D4D]">Agenda de hoy</h3>
        {agenda.length === 0 ? (
          <p className="text-sm text-slate-400">
            No tienes tutorías ni guardias programadas para hoy.
          </p>
        ) : (
          <div className="space-y-4">
            {agenda.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.color}`} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-700">{a.title}</div>
                  {a.subtitle && <div className="text-xs text-slate-500">{a.subtitle}</div>}
                </div>
                <div className="shrink-0 text-xs font-medium text-slate-400">
                  {a.time.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendario de esta semana */}
      <div className="mt-5">
        <CalendarWeekPreview userId={userId} hasTutorias={hasTutorias} />
      </div>

      {/* Próximamente */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <Briefcase className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0B1D4D]">
              Prácticas y seguimiento del alumnado
            </h3>
            <p className="text-xs text-slate-500">
              Estamos construyendo el seguimiento del alumnado y los avisos
              del centro. Próximamente aquí.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
