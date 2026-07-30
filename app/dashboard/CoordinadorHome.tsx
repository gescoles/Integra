import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "./components/DashboardHeader";
import { TutoriasActivityChart } from "./components/TutoriasActivityChart";
import {
  Users,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Lock,
  Briefcase,
  UsersRound,
  ShieldAlert,
} from "lucide-react";
import {
  MATERIAL_PRIORITY_LABELS,
  MATERIAL_PRIORITY_COLORS,
  MATERIAL_STATUS_LABELS,
  MATERIAL_STATUS_COLORS,
} from "./constants";

function dayLabel(date: Date) {
  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
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

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    tutorias,
    guardiasProgramadas,
    guardiasCubiertas,
    guardiasPendientes,
    proximasGuardias,
    materialSolicitudes,
    tutoriasRecientes,
  ] = await Promise.all([
    prisma.tutoria.findMany({ where: { schoolId } }),
    prisma.guardia.count({ where: { schoolId, status: "PROGRAMADA" } }),
    prisma.guardia.count({ where: { schoolId, status: "CUBIERTA" } }),
    prisma.guardia.count({ where: { schoolId, status: "PENDIENTE" } }),
    prisma.guardia.findMany({
      where: { schoolId, fecha: { gte: new Date() } },
      include: { profesor: { select: { name: true } } },
      orderBy: { fecha: "asc" },
      take: 5,
    }),
    prisma.materialRequest.findMany({
      where: { schoolId },
      include: { profesor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.tutoria.findMany({
      where: { schoolId, sessionDate: { gte: sevenDaysAgo } },
    }),
  ]);

  const totalGuardias = guardiasProgramadas + guardiasCubiertas + guardiasPendientes;
  const cobertura = totalGuardias > 0 ? Math.round((guardiasCubiertas / totalGuardias) * 100) : 0;

  const estudiantesAtendidos = new Set(tutorias.map((t) => t.studentName)).size;
  const tutoriasPendientes = tutorias.filter((t) => t.status === "PENDIENTE").length;

  const materialPendiente = materialSolicitudes.filter((m) => m.status === "EN_REVISION").length;
  const costeEstimadoTotal = materialSolicitudes.reduce((sum, m) => sum + m.costeEstimado, 0);

  // Serie de los últimos 7 días para el gráfico
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const dayStr = dayLabel(d);
    const dayTutorias = tutoriasRecientes.filter(
      (t) => dayLabel(new Date(t.sessionDate)) === dayStr
    );
    return {
      day: dayStr,
      nuevas: dayTutorias.filter((t) => t.status === "NUEVA").length,
      seguimiento: dayTutorias.filter((t) => t.status === "SEGUIMIENTO").length,
      completadas: dayTutorias.filter((t) => t.status === "COMPLETADA").length,
      pendientes: dayTutorias.filter((t) => t.status === "PENDIENTE").length,
    };
  });

  const modulosEnDesarrollo = [
    {
      icon: Briefcase,
      color: "bg-emerald-50 text-emerald-600",
      title: "Prácticas",
      text: "Gestión de prácticas y seguimiento del alumnado.",
    },
    {
      icon: UsersRound,
      color: "bg-blue-50 text-[#2F6FED]",
      title: "Coordinación",
      text: "Reuniones, acuerdos y seguimiento institucional.",
    },
    {
      icon: ShieldAlert,
      color: "bg-red-50 text-red-500",
      title: "Disciplina",
      text: "Incidencias, mediación y convivencia escolar.",
    },
  ];

  return (
    <div>
      <DashboardHeader
        title="Panel general"
        subtitle={`Bienvenido, ${userName}. Aquí tienes el resumen de la actividad del centro.`}
        userName={userName}
        role={role}
        notificationCount={3}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">Tutorías</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">
            {tutorias.length} <span className="text-sm font-normal text-slate-400">activas</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
            <div>
              <div className="text-sm font-bold text-slate-700">{estudiantesAtendidos}</div>
              <div className="text-[10px] text-slate-400">Estudiantes atendidos</div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-700">{tutoriasRecientes.length}</div>
              <div className="text-[10px] text-slate-400">Sesiones este periodo</div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-700">{tutoriasPendientes}</div>
              <div className="text-[10px] text-slate-400">Pendientes</div>
            </div>
          </div>
          <Link
            href="/dashboard/tutorias"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
          >
            Ver tutorías <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
            <ShieldCheck className="h-5 w-5 text-[#2F6FED]" />
          </div>
          <div className="mt-3 text-xs text-slate-500">Guardias</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">
            {guardiasProgramadas} <span className="text-sm font-normal text-slate-400">programadas</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
            <div>
              <div className="text-sm font-bold text-slate-700">{totalGuardias}</div>
              <div className="text-[10px] text-slate-400">Guardias programadas</div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-700">{cobertura}%</div>
              <div className="text-[10px] text-slate-400">Cobertura</div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-700">{guardiasPendientes}</div>
              <div className="text-[10px] text-slate-400">Pendientes</div>
            </div>
          </div>
          <Link
            href="/dashboard/guardias"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
          >
            Ver guardias <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
            <BookOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-xs text-slate-500">Material</div>
          <div className="text-2xl font-bold text-[#0B1D4D]">
            {materialSolicitudes.length}{" "}
            <span className="text-sm font-normal text-slate-400">solicitudes</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
            <div>
              <div className="text-sm font-bold text-slate-700">{materialSolicitudes.length}</div>
              <div className="text-[10px] text-slate-400">Nuevas este periodo</div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-700">
                {costeEstimadoTotal.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
              </div>
              <div className="text-[10px] text-slate-400">Coste estimado</div>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-700">{materialPendiente}</div>
              <div className="text-[10px] text-slate-400">En revisión</div>
            </div>
          </div>
          <Link
            href="/dashboard/material"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
          >
            Ver material <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Gráfico + guardias + material */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.9fr_1.3fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B1D4D]">Actividad de tutorías</h3>
            <span className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500">
              Últimos 7 días
            </span>
          </div>
          <TutoriasActivityChart data={chartData} />
          <Link
            href="/dashboard/tutorias"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
          >
            Ver todas las tutorías <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-[#0B1D4D]">Próximas guardias</h3>
          {proximasGuardias.length === 0 ? (
            <p className="text-xs text-slate-400">No hay guardias próximas registradas.</p>
          ) : (
            <div className="space-y-4">
              {proximasGuardias.map((g) => (
                <div key={g.id} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <ShieldCheck className="h-4 w-4 text-[#2F6FED]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-slate-700">
                      {g.turno} {g.profesor?.name ? `· ${g.profesor.name}` : ""}
                    </div>
                    <div className="truncate text-xs text-slate-500">{g.ubicacion ?? "—"}</div>
                  </div>
                  <div className="shrink-0 text-[11px] text-slate-400">
                    {new Date(g.fecha).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/dashboard/guardias"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
          >
            Ver todas las guardias <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-bold text-[#0B1D4D]">
            Material necesario solicitado por el profesorado
          </h3>
          {materialSolicitudes.length === 0 ? (
            <p className="text-xs text-slate-400">No hay solicitudes de material todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="pb-2 pr-2 font-medium">Material</th>
                    <th className="pb-2 pr-2 font-medium">Prioridad</th>
                    <th className="pb-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {materialSolicitudes.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-2">
                        <div className="font-semibold text-slate-700">{m.materialName}</div>
                        <div className="text-slate-400">{m.cicloModulo}</div>
                      </td>
                      <td className="py-2 pr-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${MATERIAL_PRIORITY_COLORS[m.prioridad]}`}
                        >
                          {MATERIAL_PRIORITY_LABELS[m.prioridad]}
                        </span>
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${MATERIAL_STATUS_COLORS[m.status]}`}
                        >
                          {MATERIAL_STATUS_LABELS[m.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link
            href="/dashboard/material"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
          >
            Ver todas las solicitudes de material <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Módulos en desarrollo */}
      <div className="mt-5">
        <h3 className="mb-3 text-sm font-bold text-[#0B1D4D]">Módulos en desarrollo</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {modulosEnDesarrollo.map((m) => (
            <div key={m.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <h4 className="mt-3 text-sm font-bold text-[#0B1D4D]">{m.title}</h4>
              <p className="mt-1 text-xs text-slate-500">{m.text}</p>
              <button
                disabled
                className="mt-3 flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400"
              >
                <Lock className="h-3.5 w-3.5" /> Próximamente
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
