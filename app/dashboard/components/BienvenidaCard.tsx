import { Users, Landmark, Calendar } from "lucide-react";

export function BienvenidaCard({
  userName,
  logoUrl,
  numAlumnos,
  numDocentes,
  city,
  cursoAcademico,
}: {
  userName: string;
  logoUrl: string | null | undefined;
  numAlumnos: number;
  numDocentes: number;
  city: string | null | undefined;
  cursoAcademico: string | null | undefined;
}) {
  const stats = [
    {
      icon: Users,
      color: "bg-[#FD5249]/10 text-[#FD5249]",
      label: "Comunidad educativa",
      value: `${numAlumnos.toLocaleString("es-ES")} alumnos · ${numDocentes.toLocaleString("es-ES")} docentes`,
    },
    city
      ? {
          icon: Landmark,
          color: "bg-emerald-50 text-emerald-600",
          label: "Ubicación",
          value: city,
        }
      : null,
    cursoAcademico
      ? {
          icon: Calendar,
          color: "bg-[#FD5249]/10 text-[#FD5249]",
          label: "Curso académico",
          value: cursoAcademico,
        }
      : null,
  ].filter(Boolean) as { icon: typeof Users; color: string; label: string; value: string }[];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
      <div className="flex flex-col gap-6 sm:gap-8 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-50 ring-1 ring-slate-100 sm:h-28 sm:w-28">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Landmark className="h-7 w-7 text-slate-300 sm:h-11 sm:w-11" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#0B1D4D] sm:text-2xl">¡Bienvenido, {userName}!</h2>
            <p className="mt-1.5 max-w-md text-sm text-slate-500 sm:text-base">
              Nos alegra verte de nuevo. Aquí tienes un resumen de lo más importante para que tu día sea un éxito.
            </p>
          </div>
        </div>

        {stats.length > 0 && (
          <div className="flex shrink-0 flex-col gap-4 md:border-l md:border-slate-200 md:pl-8">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-bold text-[#0B1D4D]">{s.label}</div>
                  <div className="text-xs text-slate-500">{s.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
