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
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center gap-5">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-50 ring-1 ring-slate-100">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Landmark className="h-9 w-9 text-slate-300" />
          )}
        </div>

        <div className="min-w-[220px] flex-1">
          <h2 className="text-lg font-bold text-[#0B1D4D]">¡Bienvenido, {userName}!</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Nos alegra verte de nuevo. Aquí tienes un resumen de lo más importante para que tu día sea un éxito.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-blue-50/60 px-3.5 py-2.5">
              <Users className="h-4 w-4 shrink-0 text-[#2F6FED]" />
              <div className="leading-tight">
                <div className="text-[11px] font-semibold text-slate-500">Comunidad educativa</div>
                <div className="text-xs text-slate-600">
                  {numAlumnos.toLocaleString("es-ES")} alumnos · {numDocentes.toLocaleString("es-ES")} docentes
                </div>
              </div>
            </div>

            {city && (
              <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50/60 px-3.5 py-2.5">
                <Landmark className="h-4 w-4 shrink-0 text-emerald-600" />
                <div className="leading-tight">
                  <div className="text-[11px] font-semibold text-slate-500">Ubicación</div>
                  <div className="text-xs text-slate-600">{city}</div>
                </div>
              </div>
            )}

            {cursoAcademico && (
              <div className="flex items-center gap-2.5 rounded-xl bg-rose-50/60 px-3.5 py-2.5">
                <Calendar className="h-4 w-4 shrink-0 text-rose-500" />
                <div className="leading-tight">
                  <div className="text-[11px] font-semibold text-slate-500">Curso académico</div>
                  <div className="text-xs text-slate-600">{cursoAcademico}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
