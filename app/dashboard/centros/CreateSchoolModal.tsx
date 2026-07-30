"use client";

import { useState, useRef } from "react";
import { X, Plus } from "lucide-react";
import { createSchool } from "./actions";
import { MODULES, PLAN_LABELS, TYPE_LABELS } from "./constants";

export function CreateSchoolModal() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      await createSchool(formData);
      setOpen(false);
      formRef.current?.reset();
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
        <Plus className="h-4 w-4" /> Nuevo centro
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">Crear centro</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nombre del centro
                </label>
                <input
                  name="name"
                  required
                  placeholder="Ej. IES Joan Maragall"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Tipo
                  </label>
                  <select
                    name="type"
                    defaultValue="PRIVADO"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  >
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Ciudad
                  </label>
                  <input
                    name="city"
                    placeholder="Ej. Barcelona"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Plan
                  </label>
                  <select
                    name="plan"
                    defaultValue="BASICO"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  >
                    {Object.entries(PLAN_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Límite de usuarios
                  </label>
                  <input
                    name="userLimit"
                    type="number"
                    min={1}
                    defaultValue={50}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Módulos contratados
                </label>
                <div className="flex flex-wrap gap-2">
                  {MODULES.map((m) => (
                    <label
                      key={m.key}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${m.color}`}
                    >
                      <input type="checkbox" name="modules" value={m.key} className="accent-current" />
                      <m.icon className="h-3.5 w-3.5" />
                      {m.label}
                    </label>
                  ))}
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
                  {pending ? "Creando..." : "Crear centro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
