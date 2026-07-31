"use client";

import { useRef, useState } from "react";
import { Plus, Pencil, X, ClipboardList, Link2, Euro, UserCircle } from "lucide-react";
import { createMaterial, updateMaterial } from "./actions";
import { MATERIAL_CATEGORIA_LABELS } from "../constants";

type MaterialData = {
  id: string;
  nombre: string;
  curso: string;
  asignatura: string;
  cantidad: number;
  precioUnidad: number;
  proveedor: string;
  enlace: string | null;
  categoria: string;
  justificacion?: string;
};

export function MaterialFormModal({
  userName,
  material,
  trigger,
}: {
  userName: string;
  material?: MaterialData;
  trigger?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justLength, setJustLength] = useState(material?.justificacion?.length ?? 0);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(material);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      if (isEdit) {
        formData.set("id", material!.id);
        await updateMaterial(formData);
      } else {
        await createMaterial(formData);
      }
      setOpen(false);
      formRef.current?.reset();
      setJustLength(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el material.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {trigger === "icon" ? (
        <button
          onClick={() => setOpen(true)}
          title="Editar"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#2F6FED]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1]"
        >
          <Plus className="h-4 w-4" /> Añadir material
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[#2F6FED]" />
                <h2 className="text-lg font-bold text-[#2F6FED]">
                  {isEdit ? "Editar material" : "Información del material"}
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>
            )}

            <form ref={formRef} action={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Solicitado por
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                  <UserCircle className="h-4 w-4 text-slate-400" />
                  {userName}
                  <span className="ml-auto text-[10px] text-slate-400">(automático)</span>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nombre del material <span className="text-red-500">*</span>
                </label>
                <input
                  name="nombre"
                  required
                  defaultValue={material?.nombre}
                  placeholder="Ej.: Kit Arduino Starter UNO"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Curso <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="curso"
                    required
                    defaultValue={material?.curso}
                    placeholder="Ej.: 1º DAM"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Asignatura <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="asignatura"
                    required
                    defaultValue={material?.asignatura}
                    placeholder="Ej.: Programación"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Cantidad <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="cantidad"
                    type="number"
                    min={1}
                    required
                    defaultValue={material?.cantidad}
                    placeholder="Ej.: 15"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Precio por unidad <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 focus-within:border-[#2F6FED]">
                    <Euro className="h-4 w-4 text-slate-400" />
                    <input
                      name="precioUnidad"
                      type="number"
                      step="0.01"
                      min={0}
                      required
                      defaultValue={material?.precioUnidad}
                      placeholder="Ej.: 23,50"
                      className="w-full text-sm outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Proveedor <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="proveedor"
                    required
                    defaultValue={material?.proveedor}
                    placeholder="Ej.: PCComponentes"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Enlace más barato <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 focus-within:border-[#2F6FED]">
                  <Link2 className="h-4 w-4 text-slate-400" />
                  <input
                    name="enlace"
                    type="url"
                    required
                    defaultValue={material?.enlace ?? ""}
                    placeholder="https://www.ejemplo.com/producto"
                    className="w-full text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Añade el enlace donde se puede comprar más barato este material.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  name="categoria"
                  required
                  defaultValue={material?.categoria ?? "OTROS"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                >
                  {Object.entries(MATERIAL_CATEGORIA_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Justificación <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="justificacion"
                  required
                  maxLength={500}
                  rows={3}
                  defaultValue={material?.justificacion}
                  onChange={(e) => setJustLength(e.target.value.length)}
                  placeholder="Explica brevemente por qué es necesario este material para la asignatura o el curso."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2F6FED]"
                />
                <p className="mt-1 text-right text-xs text-slate-400">Máx. 500 caracteres · {justLength}/500</p>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
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
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60"
                >
                  {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
