import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "../components/DashboardHeader";
import { CalendarioClient } from "./CalendarioClient";
import { getWeekStart, addDays, isoDate, formatWeekRange } from "./weekUtils";

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
  const hasTutorias = school?.modules.includes("tutorias") ?? false;

  const [eventos, tutorias] = await Promise.all([
    prisma.calendarEvento.findMany({
      where: { userId: session.user.id, fecha: { gte: monday, lte: sundayEnd } },
    }),
    hasTutorias
      ? prisma.tutoria.findMany({
          where: { profesorId: session.user.id, sessionDate: { gte: monday, lte: sundayEnd } },
        })
      : Promise.resolve([]),
  ]);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dateIso = isoDate(date);
    const today = isoDate(new Date()) === dateIso;

    const eventosDia = eventos
      .filter((e) => isoDate(e.fecha) === dateIso)
      .map((e) => ({
        id: e.id,
        title: e.title,
        subtitle: "",
        horaInicio: e.horaInicio,
        horaFin: e.horaFin,
        color: e.color,
        tipo: "evento" as const,
      }));

    const tutoriasDia = tutorias
      .filter((t) => isoDate(t.sessionDate) === dateIso)
      .map((t) => ({
        id: t.id,
        title: `Tutoría · ${t.studentName}`,
        subtitle: t.cicloModulo ?? "",
        horaInicio: t.sessionDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
        horaFin: "",
        color: "#8B5CF6",
        tipo: "tutoria" as const,
      }));

    const items = [...eventosDia, ...tutoriasDia].sort((a, b) =>
      a.horaInicio.localeCompare(b.horaInicio)
    );

    return {
      dateIso,
      label: date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
      isToday: today,
      items,
    };
  });

  return (
    <div>
      <DashboardHeader
        title="Calendario"
        subtitle="Programa tus propios eventos. Tus tutorías aparecen aquí automáticamente."
        notificationCount={0}
      />
      <CalendarioClient dias={dias} weekRangeLabel={formatWeekRange(monday)} offset={offset} />
    </div>
  );
}
