import Link from "next/link";
import { Users, GraduationCap, LayoutGrid, ListChecks } from "lucide-react";

export function EstadisticasRow({
  numAlumnos,
  alumnosNuevosSemana,
  numDocentes,
  docentesNuevosSemana,
  numGrupos,
  tareasPendientes,
  tareasPendientesHref,
}: {
  numAlumnos: number;
  alumnosNuevosSemana: number;
  numDocentes: number;
  docentesNuevosSemana: number;
  numGrupos: number;
  tareasPendientes: number;
  tareasPendientesHref: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <Users className="h-4 w-4 text-[#FD5249]" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold text-[#0B1D4D]">{numAlumnos.toLocaleString("es-ES")}</div>
        <div className="text-xs text-slate-400">Alumnos</div>
        {alumnosNuevosSemana > 0 && (
          <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-[#FD5249]">
            +{alumnosNuevosSemana} esta semana
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <GraduationCap className="h-4 w-4 text-emerald-600" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold text-[#0B1D4D]">{numDocentes.toLocaleString("es-ES")}</div>
        <div className="text-xs text-slate-400">Docentes</div>
        {docentesNuevosSemana > 0 && (
          <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
            +{docentesNuevosSemana} esta semana
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
            <LayoutGrid className="h-4 w-4 text-amber-600" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold text-[#0B1D4D]">{numGrupos}</div>
        <div className="text-xs text-slate-400">Grupos</div>
        <span className="mt-1 inline-block text-[10px] font-semibold text-slate-300">Sin cambios</span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
            <ListChecks className="h-4 w-4 text-rose-600" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold text-[#0B1D4D]">{tareasPendientes}</div>
        <div className="text-xs text-slate-400">Tareas pendientes</div>
        {tareasPendientes > 0 && (
          <Link href={tareasPendientesHref} className="mt-1 inline-block text-[10px] font-semibold text-[#FD5249] hover:underline">
            Ver pendientes
          </Link>
        )}
      </div>
    </div>
  );
}
