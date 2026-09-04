"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Pencil, Plus, Send, X } from "lucide-react";
import {
  obtenerDepartamentosDelCentro,
  obtenerModulosPorGrupo,
  guardarModulosConvenio,
  enviarNotasDepartamento,
  obtenerCiclosDelCentro,
} from "../actions";
import { ButtonSpinner } from "../../components/ButtonSpinner";

type ModuloConvenio = {
  id: string;
  moduloProfesionalId: string;
  codigo: string;
  nombre: string;
  horasEmpresa: number;
  notaEnviada: boolean;
};

type ModuloCatalogo = { id: string; codigo: string; nombre: string; horasCentro: number; horasEmpresa: number };

// GRUPOS del centro que tienen catálogo de módulos (los que empiezan por
// estos prefijos). Si el centro añade un grupo de otro ciclo, simplemente
// no aparecerá ningún módulo hasta que se cargue su catálogo.
const GRUPOS_CON_MODULOS_FALLBACK: string[] = [];

// Misma lógica que el "cicloDeGrupo" del servidor, pero calculada aquí
// mismo en el cliente: es solo texto, no hace falta ir al servidor por ello.
function cicloDeGrupoLocal(grupo: string): string {
  return grupo.replace(/\d+$/, "").trim().toUpperCase();
}

function colorTotal(nMods: number) {
  if (nMods >= 3) return "bg-emerald-50 text-emerald-600 border-emerald-200";
  if (nMods >= 1) return "bg-amber-50 text-amber-600 border-amber-200";
  return "bg-red-50 text-red-600 border-red-200";
}

export function ModulosConvenioBlock({
  convenioId,
  fichaId,
  departamentoId,
  departamentoNombre,
  cicloGrupo,
  modulos,
  notaFinal,
  bloqueado,
}: {
  convenioId: string;
  fichaId: string;
  departamentoId: string | null;
  departamentoNombre: string | null;
  cicloGrupo: string | null;
  modulos: ModuloConvenio[];
  notaFinal: string | null;
  bloqueado: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnviarNotas() {
    setEnviando(true);
    setError(null);
    try {
      await enviarNotasDepartamento(convenioId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron enviar las notas.");
    } finally {
      setEnviando(false);
    }
  }

  const yaEnviadas = modulos.length > 0 && modulos.every((m) => m.notaEnviada);
  const totalHoras = modulos.reduce((sum, m) => sum + (m.horasEmpresa || 0), 0);

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Módulos evaluados</span>
          {departamentoNombre && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {departamentoNombre}
              {cicloGrupo ? ` · ${cicloGrupo}` : ""}
            </span>
          )}
        </div>
        {!bloqueado && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FD5249] hover:underline"
          >
            {modulos.length > 0 ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            {modulos.length > 0 ? "Editar módulos" : "Seleccionar módulos"}
          </button>
        )}
      </div>

      {error && <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}

      {modulos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">
          Encara no s'ha seleccionat cap mòdul per a aquest conveni.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400">
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Módulo</th>
                  <th className="px-3 py-2 font-medium">Horas empresa</th>
                </tr>
              </thead>
              <tbody>
                {modulos.map((m) => (
                  <tr key={m.id} className="border-t border-slate-50">
                    <td className="px-3 py-2 text-slate-400">{m.codigo}</td>
                    <td className="px-3 py-2 text-slate-600">{m.nombre}</td>
                    <td className="px-3 py-2 text-slate-500">{m.horasEmpresa}h</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-100 bg-slate-50/60">
                  <td colSpan={2} className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500">
                    Total hores a l&apos;empresa
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-lg border px-2.5 py-1 text-center text-[12px] font-bold ${colorTotal(modulos.length)}`}>
                      {totalHoras}h
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {!bloqueado && departamentoId && (
            <div className="mt-2 flex items-center justify-end gap-2">
              {yaEnviadas && <span className="text-[11px] text-emerald-600">Nota enviada ✓</span>}
              <button
                onClick={handleEnviarNotas}
                disabled={enviando || !notaFinal || yaEnviadas}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1D4D] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#132a6b] disabled:cursor-not-allowed disabled:opacity-40"
                title={!notaFinal ? "Cierra el convenio con una nota final antes de enviar" : yaEnviadas ? "Ya enviada" : `Enviar al departamento de ${departamentoNombre}`}
              >
                {enviando ? <ButtonSpinner /> : <Send className="h-3 w-3" />}
                Enviar nota al departament
              </button>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <SeleccionarModulosModal
          convenioId={convenioId}
          fichaId={fichaId}
          departamentoIdInicial={departamentoId}
          cicloGrupoInicial={cicloGrupo}
          modulosSeleccionados={modulos}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

function SeleccionarModulosModal({
  convenioId,
  fichaId,
  departamentoIdInicial,
  cicloGrupoInicial,
  modulosSeleccionados,
  onClose,
}: {
  convenioId: string;
  fichaId: string;
  departamentoIdInicial: string | null;
  cicloGrupoInicial: string | null;
  modulosSeleccionados: ModuloConvenio[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [departamentos, setDepartamentos] = useState<{ id: string; nombre: string }[]>([]);
  const [gruposCentro, setGruposCentro] = useState<string[]>(GRUPOS_CON_MODULOS_FALLBACK);
  const [departamentoId, setDepartamentoId] = useState(departamentoIdInicial ?? "");
  const [cicloGrupo, setCicloGrupo] = useState(cicloGrupoInicial ?? "");
  const [catalogo, setCatalogo] = useState<ModuloCatalogo[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [seleccion, setSeleccion] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    modulosSeleccionados.forEach((m) => (inicial[m.moduloProfesionalId] = m.horasEmpresa));
    return inicial;
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    obtenerDepartamentosDelCentro().then(setDepartamentos);
    obtenerCiclosDelCentro().then(setGruposCentro);
  }, []);

  useEffect(() => {
    if (!cicloGrupo) {
      setCatalogo([]);
      return;
    }
    setCargandoCatalogo(true);
    obtenerModulosPorGrupo(cicloGrupo)
      .then(setCatalogo)
      .finally(() => setCargandoCatalogo(false));
  }, [cicloGrupo]);

  const totalHoras = useMemo(
    () => Object.values(seleccion).reduce((sum, h) => sum + (Number(h) || 0), 0),
    [seleccion]
  );
  const numSeleccionados = Object.keys(seleccion).length;

  function toggleModulo(m: ModuloCatalogo) {
    setSeleccion((prev) => {
      const next = { ...prev };
      if (m.id in next) {
        delete next[m.id];
      } else {
        next[m.id] = m.horasEmpresa;
      }
      return next;
    });
  }

  function cambiarHoras(moduloId: string, horas: number) {
    setSeleccion((prev) => ({ ...prev, [moduloId]: horas }));
  }

  async function handleGuardar() {
    if (!departamentoId) {
      setError("Elige un departamento.");
      return;
    }
    if (!cicloGrupo) {
      setError("Elige un ciclo.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const { actualizarConvenio } = await import("../actions");
      const fd = new FormData();
      fd.set("id", convenioId);
      fd.set("practicaAlumnoId", fichaId);
      fd.set("departamentoId", departamentoId);
      fd.set("cicloGrupo", cicloGrupo);
      await actualizarConvenio(fd);

      await guardarModulosConvenio(
        convenioId,
        Object.entries(seleccion).map(([moduloProfesionalId, horasEmpresa]) => ({ moduloProfesionalId, horasEmpresa: Number(horasEmpresa) }))
      );
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">Seleccionar módulos del convenio</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Departamento</label>
            <select
              value={departamentoId}
              onChange={(e) => setDepartamentoId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            >
              <option value="">Elige un departamento...</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ciclo formativo</label>
            <select
              value={cicloGrupo}
              onChange={(e) => setCicloGrupo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            >
              <option value="">Elige un ciclo...</option>
              {gruposCentro.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          {cargandoCatalogo ? (
            <div className="py-8 text-center text-sm text-slate-400">Cargando módulos...</div>
          ) : !cicloGrupo ? (
            <div className="py-8 text-center text-sm text-slate-400">Elige primero un ciclo para ver sus módulos.</div>
          ) : catalogo.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Todavía no hay módulos cargados para {cicloDeGrupoLocal(cicloGrupo)}.
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-slate-400">
                    <th className="w-8 px-3 py-2" />
                    <th className="px-3 py-2 font-medium">Código</th>
                    <th className="px-3 py-2 font-medium">Módulo profesional</th>
                    <th className="px-3 py-2 font-medium">Horas empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogo.map((m) => {
                    const marcado = m.id in seleccion;
                    return (
                      <tr key={m.id} className={`border-t border-slate-50 ${marcado ? "bg-orange-50/40" : ""}`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={marcado} onChange={() => toggleModulo(m)} className="h-4 w-4 accent-[#FD5249]" />
                        </td>
                        <td className="px-3 py-2 text-slate-400">{m.codigo}</td>
                        <td className="px-3 py-2 text-slate-600">{m.nombre}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={marcado ? seleccion[m.id] : m.horasEmpresa}
                            onChange={(e) => cambiarHoras(m.id, Number(e.target.value))}
                            disabled={!marcado}
                            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#FD5249] disabled:bg-slate-50 disabled:text-slate-300"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-500">{numSeleccionados} mòdul(s) seleccionat(s)</span>
          <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${colorTotal(numSeleccionados)}`}>
            Total: {totalHoras}h a l&apos;empresa
          </span>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel·lar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
          >
            {guardando && <ButtonSpinner />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
