"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Search, Lock } from "lucide-react";
import { crearFichaAlumno } from "./actions";
import { CampoDesactivable } from "./CampoDesactivable";
import { CampoTelefonoDesactivable } from "./CampoTelefonoDesactivable";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";
import { calcularEdad } from "@/lib/fechas";

type AlumnoOption = {
  id: string;
  nombre: string;
  curso: string;
  avatarUrl: string | null;
  fechaNacimiento: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  direccion: string | null;
  profesorNombre: string | null;
};

export function FichaAlumnoFormModal({
  alumnos,
  userName,
  gruposCentro = [],
}: {
  alumnos: AlumnoOption[];
  userName: string;
  gruposCentro?: string[];
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

  // El curso del alumno dice si es de 1º o 2º (termina en "1" o "2"), pero
  // eso solo importa si el ciclo dura 2 años de verdad — para saberlo,
  // miramos si existe la pareja en la lista de grupos del centro (p. ej.
  // si el alumno es "...1", ¿existe también "...2" del mismo ciclo?).
  //   - Ciclo de 2 años: de 2º se titula al final de este curso escolar;
  //     de 1º, al del siguiente.
  //   - Ciclo de 1 año (no tiene pareja): se titula al final del curso
  //     escolar que viene, siempre — un año más tarde de ahora.
  // El curso escolar se considera que empieza en septiembre.
  const anyTitulacionCalculado = useMemo(() => {
    if (!alumnoSeleccionado) return "";
    const curso = alumnoSeleccionado.curso;
    const match = curso.match(/^(.*?)\s*(\d+)\s*$/);

    const hoy = new Date();
    // Umbral en agosto (no septiembre): en agosto ya se está organizando
    // el curso que va a empezar, así que cuenta como "el curso actual" a
    // efectos de calcular cuándo se titula, aunque las clases no hayan
    // arrancado todavía.
    const finCursoActual = hoy.getMonth() >= 7 ? hoy.getFullYear() + 1 : hoy.getFullYear();

    if (!match) {
      // No termina en número: es un ciclo de 1 año sin más.
      return String(finCursoActual + 1);
    }

    const [, base, numeroStr] = match;
    const numero = Number(numeroStr);
    const parejaBuscada = `${base} ${numero === 1 ? 2 : 1}`.trim();
    const tieneParejaDeDosAnyos = gruposCentro.some((g) => g.trim() === parejaBuscada);

    if (!tieneParejaDeDosAnyos) {
      // Aunque termine en "1", si no existe el "2" correspondiente es un
      // ciclo de 1 año — se titula el curso que viene, no este.
      return String(finCursoActual + 1);
    }

    return String(numero >= 2 ? finCursoActual : finCursoActual + 1);
  }, [alumnoSeleccionado, gruposCentro]);

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
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
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
                  <div className="flex items-center justify-between rounded-lg border border-[#FD5249] bg-blue-50 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-200">
                        {alumnoSeleccionado.avatarUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={alumnoSeleccionado.avatarUrl} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-700">{alumnoSeleccionado.nombre}</div>
                        <div className="text-xs text-slate-400">
                          {alumnoSeleccionado.curso}
                          {alumnoSeleccionado.fechaNacimiento && (
                            <> · {calcularEdad(new Date(alumnoSeleccionado.fechaNacimiento))} años</>
                          )}
                        </div>
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
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
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
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 has-[:checked]:border-[#FD5249] has-[:checked]:bg-blue-50 has-[:checked]:text-[#FD5249]">
                    <input type="radio" name="promocion" value="PRIMERA" defaultChecked className="accent-[#FD5249]" />
                    {translate(locale, "practicas.primeraPromocion")}
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 has-[:checked]:border-[#FD5249] has-[:checked]:bg-blue-50 has-[:checked]:text-[#FD5249]">
                    <input type="radio" name="promocion" value="SEGUNDA" className="accent-[#FD5249]" />
                    {translate(locale, "practicas.segundaPromocion")}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.cicloFormativo")}</label>
                  {alumnoSeleccionado ? (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                      <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {alumnoSeleccionado.curso}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
                      Elige primero un alumno
                    </div>
                  )}
                  {/* El valor real que se envía: el curso del alumno elegido, no editable a mano. */}
                  <input type="hidden" name="cicloFormativo" value={alumnoSeleccionado?.curso ?? ""} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "practicas.anyTitulacion")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    key={anyTitulacionCalculado}
                    name="anyTitulacion"
                    required
                    defaultValue={anyTitulacionCalculado}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  >
                    <option value="" disabled>
                      Selecciona...
                    </option>
                    {Array.from({ length: 2035 - 2027 + 1 }, (_, i) => 2027 + i).map((anyo) => (
                      <option key={anyo} value={anyo}>
                        {anyo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.tutorImes")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    {alumnoSeleccionado ? (alumnoSeleccionado.profesorNombre ?? "Este alumno no tiene tutor/a asignado") : "Elige un alumno"}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Es siempre el tutor/a real del alumno (el de Tutorías) — no se puede elegir aquí.
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Responsable de prácticas</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    {userName}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Quien lleva el seguimiento de estas prácticas — puedes ser tú aunque no seas su tutor/a. Equipo directivo puede reasignarlo más adelante.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.dni")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {alumnoSeleccionado ? `${alumnoSeleccionado.tipoDocumento ?? ""} ${alumnoSeleccionado.numeroDocumento ?? "—"}`.trim() : "Elige un alumno"}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.fechaNacimiento")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {alumnoSeleccionado?.fechaNacimiento ? new Date(alumnoSeleccionado.fechaNacimiento).toLocaleDateString("es-ES") : "Elige un alumno"}
                  </div>
                </div>
                <div>
                  <CampoTelefonoDesactivable label={translate(locale, "practicas.telefono")} name="telefono" />
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.correoAlumno")} name="correoAlumno" type="email" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.direccion")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {alumnoSeleccionado?.direccion ?? "Elige un alumno"}
                  </div>
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.cap")} name="cap" />
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.nuss")} name="nuss" />
                </div>
              </div>

              <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-[#FD5249]">
                {translate(locale, "practicas.avisoFichaPrimero")}
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={handleClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {translate(locale, "common.cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
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
