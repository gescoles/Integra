"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Wand2, Trash2 } from "lucide-react";
import { crearPlanta, crearAula, eliminarAula, eliminarPlanta, sembrarPlanoEjemplo, sembrarPlantasAdicionales } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

export function SembrarPlanoButton({ schoolId, sinPlantas }: { schoolId: string; sinPlantas: boolean }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sinPlantas) return null;

  function handleClick() {
    setError(null);
    setPending(true);
    sembrarPlanoEjemplo(schoolId)
      .then(() => router.refresh())
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el plano."))
      .finally(() => setPending(false));
  }

  return (
    <div className="mb-5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5 text-center">
      <p className="mb-3 text-sm text-slate-600">{translate(locale, "espacios.avisoSinPlano")}</p>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? <ButtonSpinner /> : <Wand2 className="h-4 w-4" />}
        {translate(locale, "espacios.cargarPlanoEjemplo")}
      </button>
    </div>
  );
}

// Añade las plantas 2, 3, 4 y 5 (con sus aulas y su baño cada una) sin
// tocar las que ya hubiera — a diferencia del botón de arriba, este no
// exige que el centro esté vacío.
export function SembrarPlantasAdicionalesButton({ schoolId, plantasExistentes }: { schoolId: string; plantasExistentes: number[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const faltaAlguna = [2, 3, 4, 5].some((n) => !plantasExistentes.includes(n));
  if (!faltaAlguna) return null;

  function handleClick() {
    setError(null);
    setPending(true);
    sembrarPlantasAdicionales(schoolId)
      .then(() => router.refresh())
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron crear las plantas."))
      .finally(() => setPending(false));
  }

  return (
    <div className="mb-5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5 text-center">
      <p className="mb-3 text-sm text-slate-600">Faltan por crear las plantas 2, 3, 4 y 5 (con sus aulas y su baño cada una).</p>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? <ButtonSpinner /> : <Wand2 className="h-4 w-4" />}
        Crear plantas 2, 3, 4 y 5
      </button>
    </div>
  );
}

export function NuevaPlantaModal({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("schoolId", schoolId);
    setPending(true);
    setError(null);
    try {
      await crearPlanta(formData);
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
      >
        <Plus className="h-3.5 w-3.5" /> {translate(locale, "espacios.nuevaPlanta")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-xs rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0B1D4D]">{translate(locale, "espacios.nuevaPlanta")}</h3>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <form action={handleSubmit} className="space-y-3">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "espacios.numeroPlanta")}</label>
                <input name="numero" type="number" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "espacios.nombrePlanta")}</label>
                <input name="nombre" required placeholder="Planta 0" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]" />
              </div>
              <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {pending && <ButtonSpinner />} {translate(locale, "common.guardar")}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function EliminarPlantaButton({ plantaId }: { plantaId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  function handleClick() {
    if (!confirm(translate(locale, "espacios.confirmEliminarPlanta"))) return;
    eliminarPlanta(plantaId).then(() => router.refresh());
  }
  return (
    <button onClick={handleClick} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

export function NuevaAulaModal({ plantaId }: { plantaId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("plantaId", plantaId);
    setPending(true);
    setError(null);
    try {
      await crearAula(formData);
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
      >
        <Plus className="h-3.5 w-3.5" /> {translate(locale, "espacios.nuevaAula")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0B1D4D]">{translate(locale, "espacios.nuevaAula")}</h3>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <form action={handleSubmit} className="space-y-3">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "espacios.nombreAula")}</label>
                <input name="nombre" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">X</label>
                  <input name="x" type="number" step="0.1" defaultValue={0} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Z</label>
                  <input name="z" type="number" step="0.1" defaultValue={0} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "espacios.ancho")}</label>
                  <input name="ancho" type="number" step="0.1" defaultValue={2} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "espacios.profundo")}</label>
                  <input name="profundo" type="number" step="0.1" defaultValue={2} required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">{translate(locale, "espacios.color")}</label>
                <input name="color" type="color" defaultValue="#60A5FA" className="h-9 w-full rounded-lg border border-slate-200" />
              </div>
              <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {pending && <ButtonSpinner />} {translate(locale, "common.guardar")}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function EliminarAulaButton({ aulaId }: { aulaId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  function handleClick() {
    if (!confirm(translate(locale, "espacios.confirmEliminarAula"))) return;
    eliminarAula(aulaId).then(() => router.refresh());
  }
  return (
    <button onClick={handleClick} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
