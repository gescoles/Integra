import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { CalendarioClient } from "./CalendarioClient";
import { getWeekStart, addDays, isoDate, formatWeekRange } from "./weekUtils";

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
  searchParams: { offset?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return null;

  const offset = Number(searchParams.offset ?? 0) || 0;
  const monday = getWeekStart(offset);
  const sunday = addDays(monday, 6);
  const sundayEnd = new Date(sunday);
  sundayEnd.setHours(23, 59, 59, 999);

  const school = session.user.schoolId
    ? await prisma.school.findUnique({ where: { id: session.user.schoolId }, select: { modules: true } })
    : null;
  const modules = school?.modules ?? [];
  const hasTutorias = modules.includes("tutorias");
  const hasGuardias = modules.includes("guardias");

  const [horarioBloques, eventos, tutorias, guardias] = await Promise.all([
    prisma.horarioBloque.findMany({ where: { profesorId: session.user.id } }),
    prisma.calendarEvento.findMany({
      where: { userId: session.user.id, fecha: { gte: monday, lte: sundayEnd } },
    }),
    hasTutorias
      ? prisma.tutoria.findMany({
          where: { profesorId: session.user.id, sessionDate: { gte: monday, lte: sundayEnd } },
        })
      : Promise.resolve([]),
    hasGuardias
      ? prisma.guardia.findMany({
          where: { profesorId: session.user.id, fecha: { gte: monday, lte: sundayEnd } },
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
          editable: true,
          realId: t.id,
        })),
      // Guardias reales del día
      ...guardias
        .filter((g) => isoDate(g.fecha) === dateIso)
        .map((g) => ({
          id: `guardia-${g.id}`,
          title: g.turno,
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
          editable: true,
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
        title="Calendario"
        subtitle="Tu horario semanal, tutorías y guardias se reflejan aquí. Añade tus propios eventos cuando quieras."
        notificationCount={0}
      />
      <CalendarioClient
        dias={dias}
        weekRangeLabel={formatWeekRange(monday)}
        offset={offset}
        hourStart={HOUR_START}
        hourEnd={HOUR_END}
      />
    </div>
  );
}
