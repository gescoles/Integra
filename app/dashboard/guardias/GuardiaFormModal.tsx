"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createGuardia } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type ProfesorOption = { id: string; name: string };

export function GuardiaFormModal({
  schoolId,
  profesores,
}: {
  schoolId: string;
  profesores: ProfesorOption[];
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<{ canal: string; ok: boolean; error?: string }[] | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleClose() {
    setOpen(false);
    setAvisos(null);
    setError(null);
    formRef.current?.reset();
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setAvisos(null);
    try {
      const result = await createGuardia(formData);
      router.refresh();
      // Dejamos el modal abierto un momento mostrando si el email y el
      // evento de Teams se enviaron bien, en vez de cerrarlo de golpe: la
      // guardia ya está guardada de todas formas, pase lo que pase con los avisos.
      setAvisos(result?.avisos ?? []);
      formRef.current?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la guardia.");
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
        <Plus className="h-4 w-4" /> {translate(locale, "guardias.nuevaGuardia")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "guardias.nuevaGuardia")}</h2>
              <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            {avisos ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                  {translate(locale, "guardias.guardiaCreada")}
                </div>
                <div className="space-y-2">
                  {avisos.map((a) => (
                    <div
                      key={a.canal}
                      className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
                        a.ok ? "bg-slate-50 text-slate-600" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {a.ok ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {a.canal === "email" ? translate(locale, "guardias.avisoEmail") : translate(locale, "guardias.avisoTeams")}
                        </div>
                        {!a.ok && <div className="mt-0.5 text-xs">{a.error}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleClose}
                  className="w-full rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
                >
                  {translate(locale, "common.cerrar")}
                </button>
              </div>
            ) : (
              <form ref={formRef} action={handleSubmit} className="space-y-4">
                <input type="hidden" name="schoolId" value={schoolId} />

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "guardias.colProfesor")}
                  </label>
                  <select
                    name="profesorId"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  >
                    <option value="" disabled>
                      {translate(locale, "guardias.elegirProfesor")}
                    </option>
                    {profesores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "tutorias.colFecha")}
                    </label>
                    <input
                      name="fecha"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "calendario.horaInicio")}
                    </label>
                    <input
                      name="hora"
                      type="time"
                      required
                      defaultValue="09:00"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "guardias.turno")}
                  </label>
                  <input
                    name="turno"
                    required
                    placeholder={translate(locale, "guardias.turnoPlaceholder")}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "guardias.aula")}
                    </label>
                    <input
                      name="ubicacion"
                      placeholder={translate(locale, "guardias.aulaPlaceholder")}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      {translate(locale, "guardias.grupo")}
                    </label>
                    <input
                      name="grupo"
                      placeholder={translate(locale, "guardias.grupoPlaceholder")}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "guardias.tarea")}
                  </label>
                  <textarea
                    name="tarea"
                    rows={3}
                    placeholder={translate(locale, "guardias.tareaPlaceholder")}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>

                <p className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-[#FD5249]">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {translate(locale, "guardias.avisoAutomatico")}
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {translate(locale, "common.cancelar")}
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                  >
                    {pending && <ButtonSpinner />}
                    {pending ? translate(locale, "common.creando") : translate(locale, "guardias.crearYAvisar")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
