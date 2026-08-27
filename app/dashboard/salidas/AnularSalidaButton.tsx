"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, X } from "lucide-react";
import { anularSalida } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";

export function AnularSalidaButton({ id, actividad }: { id: string; actividad: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmar() {
    if (!motivo.trim()) {
      setError("El motivo es obligatorio.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await anularSalida(id, motivo);
      router.refresh();
      setOpen(false);
      setMotivo("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo anular la salida.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Anul·lar salida"
        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
      >
        <Ban className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">Anul·lar salida</h2>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Vas a anul·lar &quot;{actividad}&quot;, que ja estava aprovada. Es notificarà per email al professor que la va crear.
            </p>

            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Motiu de l&apos;anul·lació <span className="text-red-500">*</span>
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              required
              placeholder="Explica per què s'anul·la aquesta sortida..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {pending && <ButtonSpinner />}
                Anul·lar salida
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
