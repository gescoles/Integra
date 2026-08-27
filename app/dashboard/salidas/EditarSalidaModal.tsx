"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { editarSalida } from "./actions";
import { obtenerDepartamentosDelCentro } from "../practicas/actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { CursoSelect } from "../components/CursoSelect";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type ProfesorOption = { id: string; name: string };

type Salida = {
  id: string;
  curso: string;
  tipo: string | null;
  actividad: string;
  fecha: string;
  horaSalida: string;
  horaVuelta: string | null;
  responsableId: string;
  departamentoId: string | null;
  numAlumnos: number;
  costo: number;
  moneda: string;
  observaciones: string | null;
  profesoresIds: string[];
};

export function EditarSalidaModal({
  salida,
  profesores,
}: {
  salida: Salida;
  profesores: ProfesorOption[];
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departamentos, setDepartamentos] = useState<{ id: string; nombre: string }[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (open) obtenerDepartamentosDelCentro().then(setDepartamentos);
  }, [open]);

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(formData: FormData) {
    formData.set("id", salida.id);
    setPending(true);
    setError(null);
    try {
      await editarSalida(formData);
      router.refresh();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo modificar la salida.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={translate(locale, "common.editar")}
        className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-[#FD5249]"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "common.editar")}</h2>
              <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "salidas.curso")} <span className="text-red-500">*</span>
                  </label>
                  <CursoSelect name="curso" defaultValue={salida.curso} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "salidas.tipo")} <span className="font-normal text-slate-400">(opcional)</span>
                  </label>
                  <select
                    name="tipo"
                    defaultValue={salida.tipo ?? ""}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  >
                    <option value="">—</option>
                    <option value="Interna">Interna</option>
                    <option value="Salida">Salida</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Departament <span className="text-red-500">*</span>
                </label>
                <select
                  name="departamentoId"
                  required
                  defaultValue={salida.departamentoId ?? ""}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                >
                  <option value="" disabled>Tria un departament...</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "salidas.actividad")} <span className="text-red-500">*</span>
                </label>
                <input
                  name="actividad"
                  required
                  defaultValue={salida.actividad}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "tutorias.colFecha")} <span className="text-red-500">*</span>
                </label>
                <input
                  name="fecha"
                  type="date"
                  required
                  defaultValue={salida.fecha.slice(0, 10)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "salidas.horaSalida")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="horaSalida"
                    type="time"
                    required
                    defaultValue={salida.horaSalida}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "salidas.horaVuelta")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="horaVuelta"
                    type="time"
                    required
                    defaultValue={salida.horaVuelta ?? ""}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "salidas.responsable")} <span className="text-red-500">*</span>
                </label>
                <select
                  name="responsableId"
                  required
                  defaultValue={salida.responsableId}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                >
                  {profesores.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "salidas.profesAcompanantes")}
                </label>
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {profesores.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-slate-600 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        name="profesoresIds"
                        value={p.id}
                        defaultChecked={salida.profesoresIds.includes(p.id)}
                        className="rounded border-slate-300 accent-[#FD5249]"
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Si quitas a alguien, le llegará un aviso de que ya no hace falta que vaya. Si añades a alguien nuevo, le llegará toda la información de la salida.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "salidas.numAlumnos")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="numAlumnos"
                    type="number"
                    min={0}
                    required
                    defaultValue={salida.numAlumnos}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "salidas.costo")}
                  </label>
                  <input
                    name="costo"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={salida.costo}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "salidas.moneda")}
                  </label>
                  <select
                    name="moneda"
                    defaultValue={salida.moneda}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "salidas.observaciones")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="observaciones"
                  rows={3}
                  required
                  defaultValue={salida.observaciones ?? ""}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

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
                  {translate(locale, "common.guardar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
