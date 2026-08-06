"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Search, Lock } from "lucide-react";
import { crearFichaAlumno } from "./actions";
import { CampoDesactivable } from "./CampoDesactivable";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type AlumnoOption = { id: string; nombre: string; curso: string; avatarUrl: string | null };

export function FichaAlumnoFormModal({
  alumnos,
  userName,
}: {
  alumnos: AlumnoOption[];
  userName: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<AlumnoOption | null>(null);
  const [busquedaAlumno, setBusquedaAlumno] = useState("");
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const alumnosFiltrados = useMemo(() => {
    const q = busquedaAlumno.trim().toLowerCase();
    if (!q) return alumnos.slice(0, 30);
    return alumnos.filter((a) => a.nombre.toLowerCase().includes(q) || a.curso.toLowerCase().includes(q)).slice(0, 30);
  }, [alumnos, busquedaAlumno]);

  function handleClose() {
    setOpen(false);
    setError(null);
    setAlumnoSeleccionado(null);
    setBusquedaAlumno("");
    formRef.current?.reset();
  }

  async function handleSubmit(formData: FormData) {
    if (!alumnoSeleccionado) {
      setError(translate(locale, "practicas.eligeAlumno"));
      return;
    }
    formData.set("alumnoId", alumnoSeleccionado.id);
    setPending(true);
    setError(null);
    try {
      const result = await crearFichaAlumno(formData);
      router.refresh();
      handleClose();
      if (result?.id) router.push(`/dashboard/practicas/${result.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la ficha.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1]"
      >
        <Plus className="h-4 w-4" /> {translate(locale, "practicas.nuevaFicha")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "practicas.nuevaFicha")}</h2>
              <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "practicas.alumno")} <span className="text-red-500">*</span>
                </label>
                {alumnoSeleccionado ? (
                  <div className="flex items-center justify-between rounded-lg border border-[#2F6FED] bg-blue-50 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-200">
                        {alumnoSeleccionado.avatarUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={alumnoSeleccionado.avatarUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-700">{alumnoSeleccionado.nombre}</div>
                        <div className="text-xs text-slate-400">{alumnoSeleccionado.curso}</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => setAlumnoSeleccionado(null)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={busquedaAlumno}
                      onChange={(e) => setBusquedaAlumno(e.target.value)}
                      onFocus={() => setBuscadorAbierto(true)}
                      onBlur={() => setTimeout(() => setBuscadorAbierto(false), 150)}
                      placeholder={translate(locale, "practicas.buscarAlumnoPlaceholder")}
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#2F6FED]"
                    />
                    {buscadorAbierto && (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {alumnosFiltrados.length === 0 ? (
                          <div className="px-3 py-3 text-sm text-slate-400">{translate(locale, "practicas.sinAlumnosCoinciden")}</div>
                        ) : (
                          alumnosFiltrados.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onMouseDown={() => {
                                setAlumnoSeleccionado(a);
                                setBusquedaAlumno("");
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50"
                            >
                              <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-slate-200">
                                {a.avatarUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={a.avatarUrl} alt="" className="h-full w-full object-cover" />
                                )}
                              </div>
                              <span className="text-sm text-slate-700">{a.nombre}</span>
                              <span className="text-xs text-slate-400">{a.curso}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "practicas.promocion")} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 has-[:checked]:border-[#2F6FED] has-[:checked]:bg-blue-50 has-[:checked]:text-[#2F6FED]">
                    <input type="radio" name="promocion" value="PRIMERA" defaultChecked className="accent-[#2F6FED]" />
                    {translate(locale, "practicas.primeraPromocion")}
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 has-[:checked]:border-[#2F6FED] has-[:checked]:bg-blue-50 has-[:checked]:text-[#2F6FED]">
                    <input type="radio" name="promocion" value="SEGUNDA" className="accent-[#2F6FED]" />
                    {translate(locale, "practicas.segundaPromocion")}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.cicloFormativo")}</label>
                  <input name="cicloFormativo" placeholder="Ej. 1r CFGM AC" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.anyTitulacion")}</label>
                  <input name="anyTitulacion" placeholder="Ej. 2027" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.tutorImes")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    {userName}
                  </div>
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.dni")} name="dni" />
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.fechaNacimiento")} name="fechaNacimiento" type="date" />
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.telefono")} name="telefono" />
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.correoAlumno")} name="correoAlumno" type="email" />
                </div>
                <div className="col-span-2">
                  <CampoDesactivable label={translate(locale, "practicas.direccion")} name="direccion" />
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.cap")} name="cap" />
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.nuss")} name="nuss" />
                </div>
              </div>

              <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-[#2F6FED]">
                {translate(locale, "practicas.avisoFichaPrimero")}
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={handleClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {translate(locale, "common.cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />}
                  {pending ? translate(locale, "common.creando") : translate(locale, "practicas.guardarFicha")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
