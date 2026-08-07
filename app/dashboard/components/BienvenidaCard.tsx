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
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-50 ring-1 ring-slate-100">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Landmark className="h-9 w-9 text-slate-300" />
            )}
          </div>

          <div className="min-w-[220px]">
            <h2 className="text-lg font-bold text-[#0B1D4D]">¡Bienvenido, {userName}!</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Nos alegra verte de nuevo. Aquí tienes un resumen de lo más importante para que tu día sea un éxito.
            </p>
          </div>
        </div>

        {stats.length > 0 && (
          <div className="flex flex-1 flex-col divide-y divide-slate-100 lg:flex-row lg:divide-x lg:divide-y-0 lg:border-l lg:border-slate-100 lg:pl-6">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3 py-3 first:pt-0 lg:flex-1 lg:justify-center lg:px-4 lg:py-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.color}`}>
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
