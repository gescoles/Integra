"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Pencil, Trash2, X } from "lucide-react";
import { updateAlumnoFicha, deleteAlumno } from "../tutorias/alumnoActions";
import { RIESGO_LABELS, RIESGO_COLORS } from "../tutorias/alumnoConstants";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { CursoSelect } from "../components/CursoSelect";
import { PhoneInput } from "../components/PhoneInput";
import { TutorSelect } from "../components/TutorSelect";
import { useLocale, useGuardadoTransition } from "../SchoolContext";
import { translate } from "../i18n";

type Contacto = { id: string; relacion: string; telefono: string | null; email: string | null };
type Alumno = {
  id: string;
  nombre: string;
  curso: string;
  edad: number | null;
  riesgo: string;
  avatarUrl: string | null;
  profesorId: string;
  profesorNombre: string;
  contactos: Contacto[];
};

export function MisAlumnosClient({
  alumnos,
  showProfesorColumn = false,
  showFiltroCiclo = false,
}: {
  alumnos: Alumno[];
  showProfesorColumn?: boolean;
  showFiltroCiclo?: boolean;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cicloFilter, setCicloFilter] = useState("Todos");
  const [editando, setEditando] = useState<Alumno | null>(null);
  const [isPending, startTransition] = useGuardadoTransition();
  const [error, setError] = useState<string | null>(null);

  const ciclos = useMemo(() => Array.from(new Set(alumnos.map((a) => a.curso))).sort(), [alumnos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alumnos.filter((a) => {
      if (cicloFilter !== "Todos" && a.curso !== cicloFilter) return false;
      if (q && !a.nombre.toLowerCase().includes(q) && !a.curso.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [alumnos, search, cicloFilter]);

  function handleDelete(a: Alumno) {
    if (!confirm(`${translate(locale, "misAlumnos.confirmEliminar")} ${a.nombre}? ${translate(locale, "misAlumnos.confirmEliminarAviso")}`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAlumno(a.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={translate(locale, "misAlumnos.buscarPlaceholder")}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
          />
        </div>
        {showFiltroCiclo && (
          <select
            value={cicloFilter}
            onChange={(e) => setCicloFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
          >
            <option value="Todos">{translate(locale, "misAlumnos.todosCiclos")}</option>
            {ciclos.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          {alumnos.length === 0 ? translate(locale, "misAlumnos.sinAlumnos") : translate(locale, "misAlumnos.sinResultados")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-3 pr-4 font-medium">{translate(locale, "misAlumnos.colAlumno")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "misAlumnos.colCiclo")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "misAlumnos.colEdad")}</th>
                <th className="pb-3 pr-4 font-medium">{translate(locale, "misAlumnos.colRiesgo")}</th>
                {showProfesorColumn && <th className="pb-3 pr-4 font-medium">{translate(locale, "misAlumnos.colProfesor")}</th>}
                <th className="pb-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
                        {a.avatarUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <span className="font-semibold text-slate-700">{a.nombre}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-500">{a.curso}</td>
                  <td className="py-3 pr-4 text-slate-500">{a.edad ?? "—"}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${RIESGO_COLORS[a.riesgo]}`}>
                      {RIESGO_LABELS[a.riesgo]}
                    </span>
                  </td>
                  {showProfesorColumn && <td className="py-3 pr-4 text-slate-500">{a.profesorNombre}</td>}
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditando(a)} className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-[#FD5249]">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(a)} disabled={isPending} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-400">
        {translate(locale, "tutorias.mostrando")} {filtered.length} {translate(locale, "tutorias.de")} {alumnos.length}
      </div>

      {editando && <EditarAlumnoModal alumno={editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

function EditarAlumnoModal({ alumno, onClose }: { alumno: Alumno; onClose: () => void }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const madre = alumno.contactos.find((c) => c.relacion === "Madre");
  const padre = alumno.contactos.find((c) => c.relacion === "Padre");

  async function handleSubmit(formData: FormData) {
    formData.set("id", alumno.id);
    setPending(true);
    setError(null);
    try {
      await updateAlumnoFicha(formData);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "misAlumnos.editarAlumno")}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "misAlumnos.nombre")}</label>
              <input name="nombre" defaultValue={alumno.nombre} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "misAlumnos.colCiclo")}</label>
              <CursoSelect name="curso" defaultValue={alumno.curso} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "misAlumnos.colEdad")}</label>
              <input name="edad" type="number" required min={0} max={99} defaultValue={alumno.edad ?? ""} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "misAlumnos.colRiesgo")}</label>
              <select name="riesgo" defaultValue={alumno.riesgo} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]">
                {Object.keys(RIESGO_LABELS).map((v) => (
                  <option key={v} value={v}>{RIESGO_LABELS[v]}</option>
                ))}
              </select>
            </div>
          </div>

          <TutorSelect name="tutorId" defaultValue={alumno.profesorId} />

          <div className="border-t border-slate-100 pt-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Contactos</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Madre</label>
                <div className="grid grid-cols-2 gap-2">
                  <PhoneInput name="madreTelefono" defaultValue={madre?.telefono ?? ""} required />
                  <input name="madreEmail" type="email" required placeholder="Email madre" defaultValue={madre?.email ?? ""} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Padre</label>
                <div className="grid grid-cols-2 gap-2">
                  <PhoneInput name="padreTelefono" defaultValue={padre?.telefono ?? ""} required />
                  <input name="padreEmail" type="email" required placeholder="Email padre" defaultValue={padre?.email ?? ""} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              {translate(locale, "common.cancelar")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {pending && <ButtonSpinner />}
              {translate(locale, "common.guardar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
