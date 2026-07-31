import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "./components/DashboardHeader";
import { AvisosSection } from "./components/AvisosSection";
import {
  ShieldCheck,
  BookOpen,
  Users,
  MessageCircle,
  CheckCircle2,
} from "lucide-react";

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
function combineTodayTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
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

  const hoy = startOfToday();
  const finHoy = endOfToday();
  const diaSemanaHoy = (() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  })();

  const [tutoriasHoyList, guardiasHoyList, eventosHoyList, horarioHoyList, horarioSemanal] =
    await Promise.all([
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
      prisma.calendarEvento.findMany({
        where: { userId, fecha: { gte: hoy, lte: finHoy } },
        orderBy: { horaInicio: "asc" },
      }),
      prisma.horarioBloque.findMany({
        where: { profesorId: userId, diaSemana: diaSemanaHoy },
        orderBy: { horaInicio: "asc" },
      }),
      prisma.horarioBloque.findMany({
        where: { profesorId: userId },
        orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
      }),
    ]);

  // "Agenda del día": todo lo de hoy, combinado y ordenado por hora
  const agenda = [
    ...tutoriasHoyList.map((t) => ({
      id: `tutoria-${t.id}`,
      time: t.sessionDate,
      title: `Tutoría individual`,
      subtitle: t.studentName,
      color: "bg-violet-500",
      icon: MessageCircle,
      duracion: "45 min" as string | null,
    })),
    ...guardiasHoyList.map((g) => ({
      id: `guardia-${g.id}`,
      time: g.fecha,
      title: g.turno,
      subtitle: g.ubicacion ?? "",
      color: "bg-emerald-500",
      icon: CheckCircle2,
      duracion: "30 min" as string | null,
    })),
    ...eventosHoyList.map((e) => ({
      id: `evento-${e.id}`,
      time: combineTodayTime(e.horaInicio),
      title: e.title,
      subtitle: "",
      color: "bg-pink-500",
      icon: Users,
      duracion: null as string | null,
    })),
    ...horarioHoyList.map((b) => ({
      id: `horario-${b.id}`,
      time: combineTodayTime(b.horaInicio),
      title: `${b.asignatura}`,
      subtitle: b.grupo ?? "",
      color: "bg-amber-500",
      icon: BookOpen,
      duracion: null as string | null,
    })),
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  const nextTutoria = tutoriasHoyList[0] ?? null;
  const nextGuardia = guardiasHoyList[0] ?? null;
  const nextEvento = eventosHoyList[0] ?? null;
  const nextClase = horarioHoyList[0] ?? null;

  const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

  return (
    <div>
      <DashboardHeader
        title={`¡Bienvenido, ${userName}!`}
        subtitle="Aquí tienes tus actividades y recursos para hoy."
        notificationCount={agenda.length}
      />

      {/* ¿Qué tengo hoy? */}
      <div className="mb-2">
        <h2 className="text-sm font-bold text-[#0B1D4D]">¿Qué tengo hoy?</h2>
        <p className="text-xs text-slate-500">Aquí tienes tu próxima actividad en cada área clave.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Próxima tutoría */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <MessageCircle className="h-4 w-4 text-[#2F6FED]" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Próxima tutoría</span>
          </div>
          {!hasTutorias ? (
            <p className="mt-2 text-xs text-slate-400">Módulo no contratado por tu centro.</p>
          ) : nextTutoria ? (
            <>
              <div className="mt-2 text-xl font-bold text-[#0B1D4D]">
                {nextTutoria.sessionDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <p className="text-xs text-slate-500">
                {nextTutoria.cicloModulo ?? ""} · Tutoría individual
                <br />
                {nextTutoria.studentName}
              </p>
              <Link
                href="/dashboard/tutorias"
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-[#2F6FED] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#255ed1]"
              >
                Abrir tutoría
              </Link>
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Sin tutorías para hoy.</p>
          )}
        </div>

        {/* Próxima guardia */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Próxima guardia</span>
          </div>
          {!hasGuardias ? (
            <p className="mt-2 text-xs text-slate-400">Módulo no contratado por tu centro.</p>
          ) : nextGuardia ? (
            <>
              <div className="mt-2 text-xl font-bold text-[#0B1D4D]">
                {nextGuardia.fecha.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <p className="text-xs text-slate-500">
                {nextGuardia.ubicacion ?? ""}
                <br />
                {nextGuardia.turno}
              </p>
              <Link
                href="/dashboard/guardias"
                className="mt-2 inline-flex items-center justify-center rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
              >
                Ver mis guardias
              </Link>
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Sin guardias para hoy.</p>
          )}
        </div>

        {/* Próximo evento */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50">
              <Users className="h-4 w-4 text-pink-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Próximo evento</span>
          </div>
          {nextEvento ? (
            <>
              <div className="mt-2 text-xl font-bold text-[#0B1D4D]">{nextEvento.horaInicio}</div>
              <p className="text-xs text-slate-500">{nextEvento.title}</p>
              <Link
                href="/dashboard/calendario"
                className="mt-2 inline-flex items-center justify-center rounded-lg border border-pink-200 px-3 py-1.5 text-xs font-semibold text-pink-600 hover:bg-pink-50"
              >
                Ver calendario
              </Link>
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Sin eventos para hoy.</p>
          )}
        </div>

        {/* Próxima clase */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <BookOpen className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Próxima clase</span>
          </div>
          {nextClase ? (
            <>
              <div className="mt-2 text-xl font-bold text-[#0B1D4D]">{nextClase.horaInicio}</div>
              <p className="text-xs text-slate-500">
                {nextClase.grupo ?? ""} · {nextClase.asignatura}
              </p>
              <Link
                href="/dashboard/horario"
                className="mt-2 inline-flex items-center justify-center rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-50"
              >
                Ver clase
              </Link>
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Sin clases para hoy.</p>
          )}
        </div>
      </div>

      {/* Agenda del día + Horario fijo semanal */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B1D4D]">Agenda del día</h3>
            <Link
              href="/dashboard/calendario"
              className="text-xs font-semibold text-[#2F6FED] hover:underline"
            >
              Ver agenda completa
            </Link>
          </div>
          {agenda.length === 0 ? (
            <p className="text-sm text-slate-400">No tienes nada programado para hoy.</p>
          ) : (
            <div className="space-y-3">
              {agenda.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${a.color}`} />
                  <a.icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-700">{a.title}</div>
                    {a.subtitle && <div className="truncate text-xs text-slate-400">{a.subtitle}</div>}
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-400">
                    <div>{a.time.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</div>
                    {a.duracion && <div className="text-[10px]">{a.duracion}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0B1D4D]">Horario fijo semanal</h3>
            <Link
              href="/dashboard/horario"
              className="text-xs font-semibold text-[#2F6FED] hover:underline"
            >
              Ver horario semanal
            </Link>
          </div>
          {horarioSemanal.length === 0 ? (
            <p className="text-sm text-slate-400">
              Todavía no has cargado tu horario. Ve a "Mi horario" para configurarlo.
            </p>
          ) : (
            <div className="space-y-3">
              {DIAS_SEMANA.map((dia, i) => {
                const bloquesDia = horarioSemanal.filter((b) => b.diaSemana === i + 1);
                if (bloquesDia.length === 0) return null;
                return (
                  <div key={dia}>
                    <div className="text-xs font-semibold text-slate-600">{dia}</div>
                    <div className="mt-1 space-y-1">
                      {bloquesDia.map((b) => (
                        <div key={b.id} className="flex items-center gap-2 text-xs text-slate-500">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: b.color }}
                          />
                          {b.horaInicio}–{b.horaFin} · {b.asignatura} · {b.grupo}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Avisos del centro */}
      <div className="mt-5">
        <AvisosSection schoolId={schoolId} canCreate={false} />
      </div>
    </div>
  );
}
