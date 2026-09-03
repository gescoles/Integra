import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { translate } from "../i18n";
import { CalendarioClient } from "./CalendarioClient";
import { getWeekStart, addDays, isoDate, formatWeekRange } from "./weekUtils";
import { SchoolPicker } from "../components/SchoolPicker";
import { ModuleLocked } from "../components/ModuleLocked";
import Link from "next/link";
import { Landmark, UserRound } from "lucide-react";

const HOUR_START = 8;
const HOUR_END = 18;

function minutesFromHourStart(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h - HOUR_START) * 60 + m;
}

function minutesFromDate(date: Date) {
  return (date.getHours() - HOUR_START) * 60 + date.getMinutes();
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { offset?: string; school?: string; user?: string };
}) {
  const session = await getServerSession(authOptions);
  const locale = session?.user.locale ?? "ES";
  if (!session?.user.id) return null;

  const isSuperAdmin = session.user.role === "SUPERADMIN";

  // SuperAdmin: elige centro y usuario para ver su calendario (solo lectura)
  if (isSuperAdmin) {
    const schools = await prisma.school.findMany({
      select: { id: true, name: true, logoUrl: true },
      orderBy: { name: "asc" },
    });

    if (!searchParams.school) {
      return (
        <div>
          <DashboardHeader title={translate(locale, "calendario.title")} subtitle={translate(locale, "calendario.subtitle")} userName={session.user.name ?? ""} role="SUPERADMIN" />
          <SchoolPicker schools={schools} locale={locale} basePath="/dashboard/calendario" />
        </div>
      );
    }

    if (!searchParams.user) {
      const usuarios = await prisma.user.findMany({
        where: { schoolId: searchParams.school, role: { in: ["PROFESOR", "COORDINADOR", "ADMIN_CENTRO", "DIRECCION"] } },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });
      return (
        <div>
          <DashboardHeader title={translate(locale, "calendario.title")} subtitle={translate(locale, "calendario.subtitle")} userName={session.user.name ?? ""} role="SUPERADMIN" />
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <UserRound className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <h3 className="mb-1 text-sm font-bold text-[#0B1D4D]">Elige un usuario</h3>
            <p className="mb-5 text-xs text-slate-400">Verás su calendario en modo lectura.</p>
            <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-2">
              {usuarios.map((u) => (
                <Link
                  key={u.id}
                  href={`/dashboard/calendario?school=${searchParams.school}&user=${u.id}`}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:border-[#FD5249] hover:text-[#FD5249]"
                >
                  {u.name ?? u.email}
                </Link>
              ))}
            </div>
          </div>
        </div>
      );
    }
  }

  const targetUserId = isSuperAdmin ? searchParams.user! : session.user.id;
  const targetSchoolId = isSuperAdmin ? searchParams.school : session.user.schoolId;

  const offset = Number(searchParams.offset ?? 0) || 0;
  const monday = getWeekStart(offset);
  const sunday = addDays(monday, 6);
  const sundayEnd = new Date(sunday);
  sundayEnd.setHours(23, 59, 59, 999);

  const school = targetSchoolId
    ? await prisma.school.findUnique({ where: { id: targetSchoolId }, select: { modules: true, name: true } })
    : null;
  const modules = school?.modules ?? [];
  const hasTutorias = modules.includes("tutorias");
  const hasGuardias = modules.includes("guardias");

  if (!isSuperAdmin && !modules.includes("utilidades")) {
    return (
      <div>
        <DashboardHeader
          title={translate(locale, "calendario.title")}
          subtitle={translate(locale, "calendario.subtitle")}
          userName={session.user.name ?? ""}
          role={session.user.role}
        />
        <ModuleLocked moduleName={translate(locale, "nav.utilidades")} />
      </div>
    );
  }

  const [horarioBloques, eventos, tutorias, guardias] = await Promise.all([
    prisma.horarioBloque.findMany({ where: { profesorId: targetUserId } }),
    prisma.calendarEvento.findMany({
      where: { userId: targetUserId, fecha: { gte: monday, lte: sundayEnd } },
    }),
    hasTutorias
      ? prisma.tutoria.findMany({
          where: { profesorId: targetUserId, sessionDate: { gte: monday, lte: sundayEnd } },
        })
      : Promise.resolve([]),
    hasGuardias
      ? prisma.guardia.findMany({
          where: { profesorId: targetUserId, fecha: { gte: monday, lte: sundayEnd } },
        })
      : Promise.resolve([]),
  ]);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dateIso = isoDate(date);
    const diaSemana = i + 1; // Lunes=1 ... Domingo=7
    const today = isoDate(new Date()) === dateIso;

    const items = [
      // Horario semanal recurrente — solo lectura aquí, se edita en "Mi horario"
      ...horarioBloques
        .filter((b) => b.diaSemana === diaSemana)
        .map((b) => ({
          id: `horario-${b.id}`,
          title: b.asignatura,
          subtitle: b.grupo ?? "",
          start: minutesFromHourStart(b.horaInicio),
          duration: minutesFromHourStart(b.horaFin) - minutesFromHourStart(b.horaInicio),
          color: b.color,
          tipo: "horario" as const,
          editable: false,
          realId: b.id,
        })),
      // Tutorías reales del día
      ...tutorias
        .filter((t) => isoDate(t.sessionDate) === dateIso)
        .map((t) => ({
          id: `tutoria-${t.id}`,
          title: `Tutoría · ${t.studentName}`,
          subtitle: t.cicloModulo ?? "",
          start: minutesFromDate(t.sessionDate),
          duration: 45,
          color: "#F59E0B",
          tipo: "tutoria" as const,
          editable: !isSuperAdmin,
          realId: t.id,
        })),
      // Guardias reales del día
      ...guardias
        .filter((g) => isoDate(g.fecha) === dateIso)
        .map((g) => ({
          id: `guardia-${g.id}`,
          title: g.turno ?? g.grupo ?? "Guardia",
          subtitle: g.ubicacion ?? "",
          start: minutesFromDate(g.fecha),
          duration: 45,
          color: "#8B5CF6",
          tipo: "guardia" as const,
          editable: false,
          realId: g.id,
        })),
      // Eventos propios, creados libremente desde este calendario
      ...eventos
        .filter((e) => isoDate(e.fecha) === dateIso)
        .map((e) => ({
          id: `evento-${e.id}`,
          title: e.title,
          subtitle: "",
          start: minutesFromHourStart(e.horaInicio),
          duration: minutesFromHourStart(e.horaFin) - minutesFromHourStart(e.horaInicio),
          color: e.color,
          tipo: "evento" as const,
          editable: !isSuperAdmin,
          realId: e.id,
        })),
    ];

    return {
      dateIso,
      label: date.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "2-digit" }),
      isToday: today,
      items,
    };
  });

  return (
    <div>
      <DashboardHeader
        title={translate(locale, "calendario.title")}
        subtitle={
          isSuperAdmin
            ? `${translate(locale, "calendario.viendoCalendarioUsuario")} (${school?.name ?? ""}) ${translate(locale, "soloLectura")}`
            : translate(locale, "calendario.tuHorarioReflejado")
        }
        notificationCount={0}
      />
      {isSuperAdmin && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <Landmark className="h-4 w-4 text-[#FD5249]" />
          <span className="text-xs font-semibold text-slate-500">{translate(locale, "modoSupervision")}</span>
          <Link
            href="/dashboard/calendario"
            className="ml-auto text-xs font-semibold text-[#FD5249] hover:underline"
          >
            {translate(locale, "cambiarCentroUsuario")}
          </Link>
        </div>
      )}
      <CalendarioClient
        dias={dias}
        weekRangeLabel={formatWeekRange(monday)}
        offset={offset}
        hourStart={HOUR_START}
        hourEnd={HOUR_END}
        readOnly={isSuperAdmin}
      />
    </div>
  );
}
