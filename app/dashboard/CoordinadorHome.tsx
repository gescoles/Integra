import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "./components/DashboardHeader";
import { translate, AppLocale } from "./i18n";
import { HistoriasBar } from "./components/HistoriasBar";
import { AvisosSection } from "./components/AvisosSection";
import { BienvenidaCard } from "./components/BienvenidaCard";
import { AgendaTimeline, type AgendaItem } from "./components/AgendaTimeline";
import { ComunidadPanel } from "./components/ComunidadPanel";
import {
  ShieldCheck,
  BookOpen,
  Users,
  MessageCircle,
  CheckCircle2,
  Bus,
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

// El panel general de Coordinación/Dirección comparte el mismo diseño que el
// de Profesor (misma estructura visual, con los datos personales del propio
// coordinador). Las funciones extra de supervisión de todo el centro se
// añaden aquí mismo, debajo, en su propia sección (ver final del archivo).
export async function CoordinadorHome({
  userId,
  userName,
  role,
  schoolId,
  locale = "ES",
}: {
  userId: string;
  userName: string;
  role: string;
  schoolId: string | null;
  locale?: AppLocale;
}) {
  if (!schoolId) {
    return (
      <div>
        <DashboardHeader
          title={`${translate(locale, "home.saludo")}, ${userName}!`}
          subtitle={translate(locale, "home.subtitle.centro")}
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
    select: { name: true, logoUrl: true, cursoAcademico: true, city: true, modules: true },
  });
  const modules = school?.modules ?? [];
  const hasTutorias = modules.includes("tutorias");
  const hasGuardias = modules.includes("guardias");
  const hasSalidas = modules.includes("salidas");

  const [numAlumnos, numDocentes, avisosRaw] = await Promise.all([
    prisma.alumno.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO"] } } }),
    prisma.aviso.findMany({
      where: {},
      include: { school: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  const avisos = avisosRaw.map((a) => ({
    id: a.id,
    titulo: a.titulo,
    cuerpo: a.cuerpo,
    categoria: a.categoria,
    createdAt: a.createdAt.toISOString(),
    schoolName: a.school.name,
  }));

  const salidasPendientes = hasSalidas
    ? await prisma.salida.count({ where: { schoolId, estado: "PENDIENTE" } })
    : 0;

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

  const agendaItems: AgendaItem[] = [
    {
      key: "tutoria",
      label: "Próxima tutoría",
      time: nextTutoria ? nextTutoria.sessionDate : null,
      detailLinea1: nextTutoria?.cicloModulo ?? "Tutoría individual",
      detailLinea2: nextTutoria?.studentName,
      href: "/dashboard/tutorias",
      colorClase: "bg-violet-500",
      icon: MessageCircle,
      disponible: hasTutorias,
    },
    {
      key: "guardia",
      label: "Próxima guardia",
      time: nextGuardia ? nextGuardia.fecha : null,
      detailLinea1: nextGuardia?.turno ?? "",
      detailLinea2: nextGuardia?.ubicacion ?? undefined,
      href: "/dashboard/guardias",
      colorClase: "bg-emerald-500",
      icon: ShieldCheck,
      disponible: hasGuardias,
    },
    {
      key: "clase",
      label: "Próxima clase",
      time: nextClase ? combineTodayTime(nextClase.horaInicio) : null,
      detailLinea1: nextClase?.asignatura ?? "",
      detailLinea2: nextClase?.grupo ?? undefined,
      href: "/dashboard/horario",
      colorClase: "bg-amber-500",
      icon: BookOpen,
      disponible: true,
    },
    {
      key: "evento",
      label: "Próximo evento",
      time: nextEvento ? combineTodayTime(nextEvento.horaInicio) : null,
      detailLinea1: nextEvento?.title ?? "",
      href: "/dashboard/calendario",
      colorClase: "bg-pink-500",
      icon: Users,
      disponible: true,
    },
  ];

  return (
    <div>
      <DashboardHeader
        title={`${translate(locale, "home.saludo")}, ${userName}!`}
        subtitle={translate(locale, "home.subtitle.centro")}
        notificationCount={agenda.length}
      />

      <div className="mb-5">
        <BienvenidaCard
          userName={userName}
          logoUrl={school?.logoUrl}
          numAlumnos={numAlumnos}
          numDocentes={numDocentes}
          city={school?.city}
          cursoAcademico={school?.cursoAcademico}
        />
      </div>

      {salidasPendientes > 0 && (
        <Link
          href="/dashboard/salidas/aprobaciones"
          className="mb-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100"
        >
          <div className="flex items-center gap-2.5">
            <Bus className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">
              {salidasPendientes === 1
                ? translate(locale, "home.salidaPendienteSingular")
                : `${salidasPendientes} ${translate(locale, "home.salidasPendientesPlural")}`}
            </span>
          </div>
          <span className="text-xs font-semibold text-amber-700 underline">
            {translate(locale, "home.revisarAhora")}
          </span>
        </Link>
      )}

      <div className="mb-5">
        <AgendaTimeline
          titulo="Agenda y prioridades de hoy"
          verMasHref="/dashboard/calendario"
          items={agendaItems}
        />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <HistoriasBar puedeSubir={role === "COORDINADOR" || role === "ADMIN_CENTRO"} currentUserId={userId} currentUserRole={role} currentUserSchoolId={schoolId} />
        <ComunidadPanel avisos={avisos} />
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

      {/* Avisos del centro — Coordinación SÍ puede publicar (Profesor no) */}
      <div className="mt-5">
        <AvisosSection schoolId={schoolId} canCreate />
      </div>

      {/*
        A partir de aquí añadiremos, en una próxima fase, lo que solo puede
        hacer Coordinación/Dirección: supervisión de todo el centro, filtros
        por profesor, estadísticas globales, etc.
      */}
    </div>
  );
}
