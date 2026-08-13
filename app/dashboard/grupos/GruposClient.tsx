"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { actualizarGruposDelCentro } from "../gruposActions";
import { ButtonSpinner } from "../components/ButtonSpinner";

export function GruposClient({ grupos: gruposIniciales }: { grupos: string[] }) {
  const [grupos, setGrupos] = useState(gruposIniciales);
  const [nuevo, setNuevo] = useState("");
  const [pending, setPending] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function anadirGrupo() {
    const valor = nuevo.trim();
    if (!valor) return;
    if (grupos.includes(valor)) {
      setNuevo("");
      return;
    }
    setGrupos([...grupos, valor]);
    setNuevo("");
  }

  function quitarGrupo(g: string) {
    setGrupos(grupos.filter((x) => x !== g));
  }

  async function guardar() {
    setPending(true);
    setError(null);
    setGuardado(false);
    try {
      const formData = new FormData();
      formData.set("grupos", grupos.join("\n"));
      await actualizarGruposDelCentro(formData);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

      <div className="mb-4 flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              anadirGrupo();
            }
          }}
          placeholder="Ej. DAM1"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
        />
        <button
          type="button"
          onClick={anadirGrupo}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" /> Añadir
        </button>
      </div>

      {grupos.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Todavía no has añadido ningún curso o grupo.
        </p>
      ) : (
        <div className="mb-6 flex flex-wrap gap-2">
          {grupos.map((g) => (
            <span
              key={g}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1.5 pl-3 pr-2 text-sm font-semibold text-[#0B1D4D]"
            >
              {g}
              <button
                type="button"
                onClick={() => quitarGrupo(g)}
                className="rounded-full p-0.5 text-slate-400 hover:bg-white hover:text-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
        >
          {pending && <ButtonSpinner />}
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
        {guardado && <span className="text-sm font-semibold text-emerald-600">Guardado ✓</span>}
      </div>
    </div>
  );
}
