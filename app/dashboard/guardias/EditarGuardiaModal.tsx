"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Save } from "lucide-react";
import { obtenerGuardiaProgramadaParaEditar, actualizarGuardiaProgramada } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type DatosGuardia = {
  origen: "guardia";
  id: string;
  fecha: string;
  hora: string;
  turno: string;
  ubicacion: string;
  grupo: string;
  tarea: string;
};
type DatosCobertura = {
  origen: "cobertura";
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  ubicacion: string;
  grupo: string;
  asignatura: string;
  trabajoAlumnos: string;
};

export function EditarGuardiaModal({
  id,
  origen,
  onClose,
}: {
  id: string;
  origen: "guardia" | "cobertura";
  onClose: () => void;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [datos, setDatos] = useState<DatosGuardia | DatosCobertura | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerGuardiaProgramadaParaEditar(id, origen)
      .then((d) => setDatos(d))
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar."))
      .finally(() => setCargando(false));
  }, [id, origen]);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await actualizarGuardiaProgramada(id, origen, formData);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "guardias.editarGuardia")}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {cargando ? (
          <p className="py-8 text-center text-sm text-slate-400">{translate(locale, "common.cargando")}</p>
        ) : !datos ? (
          <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                {translate(locale, "tutorias.colFecha")}
              </label>
              <input
                name="fecha"
                type="date"
                required
                defaultValue={datos.fecha}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
              />
            </div>

            {datos.origen === "guardia" ? (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "calendario.horaInicio")}
                  </label>
                  <input
                    name="hora"
                    type="time"
                    required
                    defaultValue={datos.hora}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "guardias.turno")}
                  </label>
                  <input
                    name="turno"
                    required
                    defaultValue={datos.turno}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "calendario.horaInicio")}
                  </label>
                  <input
                    name="horaInicio"
                    type="time"
                    required
                    defaultValue={datos.horaInicio}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "calendario.horaFin")}
                  </label>
                  <input
                    name="horaFin"
                    type="time"
                    required
                    defaultValue={datos.horaFin}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "guardias.aula")}
                </label>
                <input
                  name="ubicacion"
                  defaultValue={datos.ubicacion}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "guardias.grupo")}
                </label>
                <input
                  name="grupo"
                  defaultValue={datos.grupo}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>
            </div>

            {datos.origen === "guardia" ? (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "guardias.tarea")}
                </label>
                <textarea
                  name="tarea"
                  rows={3}
                  defaultValue={datos.tarea}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "guardias.asignatura")}
                  </label>
                  <input
                    name="asignatura"
                    defaultValue={datos.asignatura}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "guardias.trabajoAlumnos")}
                  </label>
                  <textarea
                    name="trabajoAlumnos"
                    rows={3}
                    defaultValue={datos.trabajoAlumnos}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
              </>
            )}

            <p className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-[#FD5249]">
              {translate(locale, "guardias.avisoAutomaticoEdicion")}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                {translate(locale, "common.cancelar")}
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
              >
                {pending ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
                {translate(locale, "common.guardar")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
