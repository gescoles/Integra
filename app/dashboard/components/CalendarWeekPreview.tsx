import Link from "next/link";
import { Clock, GraduationCap, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getWeekStart, addDays, isoDate } from "../calendario/weekUtils";

export async function CalendarWeekPreview({
  userId,
  hasTutorias,
}: {
  userId: string;
  hasTutorias: boolean;
}) {
  const monday = getWeekStart(0);
  const sunday = addDays(monday, 6);
  const sundayEnd = new Date(sunday);
  sundayEnd.setHours(23, 59, 59, 999);

  const [eventos, tutorias] = await Promise.all([
    prisma.calendarEvento.findMany({
      where: { userId, fecha: { gte: monday, lte: sundayEnd } },
    }),
    hasTutorias
      ? prisma.tutoria.findMany({
          where: { profesorId: userId, sessionDate: { gte: monday, lte: sundayEnd } },
        })
      : Promise.resolve([]),
  ]);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dateIso = isoDate(date);
    const today = isoDate(new Date()) === dateIso;

    const items = [
      ...eventos
        .filter((e) => isoDate(e.fecha) === dateIso)
        .map((e) => ({
          id: e.id,
          title: e.title,
          hora: e.horaInicio,
          color: e.color,
          tipo: "evento" as const,
        })),
      ...tutorias
        .filter((t) => isoDate(t.sessionDate) === dateIso)
        .map((t) => ({
          id: t.id,
          title: `Tutoría · ${t.studentName}`,
          hora: t.sessionDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
          color: "#8B5CF6",
          tipo: "tutoria" as const,
        })),
    ].sort((a, b) => a.hora.localeCompare(b.hora));

    return {
      dateIso,
      label: date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
      isToday: today,
      items,
    };
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0B1D4D]">Calendario de esta semana</h3>
        <Link
          href="/dashboard/calendario"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
        >
          Ver calendario completo <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {dias.map((dia) => (
          <div
            key={dia.dateIso}
            className={`rounded-xl border p-2.5 ${
              dia.isToday ? "border-[#2F6FED]" : "border-slate-100"
            }`}
          >
            <div
              className={`mb-1.5 text-[11px] font-bold capitalize ${
                dia.isToday ? "text-[#2F6FED]" : "text-slate-500"
              }`}
            >
              {dia.label}
            </div>
            {dia.items.length === 0 ? (
              <p className="text-[10px] text-slate-300">Sin eventos</p>
            ) : (
              <div className="space-y-1">
                {dia.items.slice(0, 3).map((it) => (
                  <div
                    key={it.id}
                    className="rounded border-l-2 bg-slate-50 px-1.5 py-1"
                    style={{ borderColor: it.color }}
                  >
                    <div className="flex items-center gap-1 text-[9px] text-slate-400">
                      <Clock className="h-2 w-2" />
                      {it.hora}
                      {it.tipo === "tutoria" && <GraduationCap className="h-2 w-2" />}
                    </div>
                    <div className="truncate text-[10px] font-medium text-slate-600">{it.title}</div>
                  </div>
                ))}
                {dia.items.length > 3 && (
                  <div className="text-[9px] text-slate-400">+{dia.items.length - 3} más</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
