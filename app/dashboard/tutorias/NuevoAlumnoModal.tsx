"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createAlumno } from "./alumnoActions";
import { RIESGO_LABELS } from "./alumnoConstants";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { PhoneInput } from "../components/PhoneInput";
import { CursoSelect } from "../components/CursoSelect";
import { TutorSelect } from "../components/TutorSelect";
import { DocumentoIdentidadInput } from "../components/DocumentoIdentidadInput";

export function NuevoAlumnoModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const id = await createAlumno(formData);
      setOpen(false);
      formRef.current?.reset();
      router.push(`/dashboard/tutorias?alumno=${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el alumno.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
      >
        <Plus className="h-4 w-4" /> Nuevo alumno
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">Nuevo alumno</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nombre completo
                </label>
                <input
                  name="nombre"
                  required
                  placeholder="Ej. Adrián López Martín"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Curso / Grupo
                  </label>
                  <CursoSelect name="curso" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Fecha de nacimiento
                  </label>
                  <input
                    name="fechaNacimiento"
                    type="date"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Documento de identidad
                </label>
                <DocumentoIdentidadInput />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Dirección
                </label>
                <input
                  name="direccion"
                  required
                  placeholder="Ej. Carrer Major, 12, El Masnou"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nivel de riesgo
                </label>
                <select
                  name="riesgo"
                  defaultValue="BAJO"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                >
                  {Object.entries(RIESGO_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <TutorSelect name="tutorId" />

              <div className="border-t border-slate-100 pt-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Contacto familiar</h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Madre</label>
                    <div className="space-y-2">
                      <PhoneInput name="madreTelefono" required />
                      <input
                        name="madreEmail"
                        type="email"
                        required
                        placeholder="madre@email.com"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Padre</label>
                    <div className="space-y-2">
                      <PhoneInput name="padreTelefono" required />
                      <input
                        name="padreEmail"
                        type="email"
                        required
                        placeholder="padre@email.com"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />}
                  {pending ? "Creando..." : "Crear alumno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
