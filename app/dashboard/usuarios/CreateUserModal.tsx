"use client";

import { useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { createUser } from "./actions";
import { ROLE_LABELS, ASSIGNABLE_ROLES } from "./constants";

type SchoolOption = { id: string; name: string };

export function CreateUserModal({ schools }: { schools: SchoolOption[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPassword, setAutoPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await createUser(formData);
      setOpen(false);
      formRef.current?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el usuario.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1]"
      >
        <Plus className="h-4 w-4" /> Nuevo usuario
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">Crear usuario</h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Nombre completo
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="Ej. Marta Rodríguez"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    DNI
                  </label>
                  <input
                    name="dni"
                    placeholder="Ej. 45678912X"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="nombre@centro.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Contraseña inicial
                </label>
                <input
                  name="password"
                  type="password"
                  required={!autoPassword}
                  disabled={autoPassword}
                  minLength={8}
                  placeholder={autoPassword ? "Se generará automáticamente" : "Mínimo 8 caracteres"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED] disabled:bg-slate-50 disabled:text-slate-400"
                />

                <label className="mt-2.5 flex items-start gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    name="autoPassword"
                    checked={autoPassword}
                    onChange={(e) => setAutoPassword(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#2F6FED]"
                  />
                  <span>
                    Generar una contraseña segura automáticamente y enviarla por
                    email a esta dirección. El usuario no podrá cambiarla; solo
                    tú podrás actualizarla más adelante desde su edición.
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Rol
                  </label>
                  <select
                    name="role"
                    defaultValue="PROFESOR"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  >
                    {ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Centro
                  </label>
                  <select
                    name="schoolId"
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  >
                    <option value="">Sin asignar</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
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
                  className="rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60"
                >
                  {pending ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
