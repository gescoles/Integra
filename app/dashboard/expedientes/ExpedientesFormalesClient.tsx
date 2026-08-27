"use client";

import { useMemo, useState } from "react";
import { Search, FileDown, FileText, ShieldAlert } from "lucide-react";
import { EnviarExpedienteButton } from "./EnviarExpedienteButton";
import { ExpedienteFormModal } from "./ExpedienteFormModal";
import { AbrirExpedienteWizard } from "./AbrirExpedienteWizard";

type AlumnoOption = { id: string; nombre: string; curso: string; avatarUrl: string | null; profesorId?: string };
type ProfesorOption = { id: string; name: string };

type ExpedienteRow = {
  id: string;
  numero: string;
  estado: "BORRADOR" | "ENVIADO";
  sancionDias: number;
  sancionMotivo: string;
  fechaInicio: string;
  fechaAplicacionInicio: string;
  fechaAplicacionFin: string;
  createdAt: string;
  enviadoEn: string | null;
  alumnoId: string;
  alumnoNombre: string;
  alumnoCurso: string;
  tutorNombre: string;
  incidenciaId: string;
  incidenciaDescripcion: string;
  esDirectivo: boolean;
  fets: string;
  testimonis: string;
  informeTutor: string;
  audienciaResumen: string;
  valoracionComision: string;
  medidasProvisionales: string;
  recursoEstado: string;
  direccionNombre: string;
  coordinadorNombre: string;
};

type PendienteRevision = { id: string; nombre: string; curso: string; totalIncidencias: number };

export function ExpedientesFormalesClient({
  expedientes,
  alumnos,
  profesores,
  pendientesRevision = [],
}: {
  expedientes: ExpedienteRow[];
  alumnos: AlumnoOption[];
  profesores: ProfesorOption[];
  pendientesRevision?: PendienteRevision[];
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "BORRADOR" | "ENVIADO">("TODOS");
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(expedientes[0]?.id ?? null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return expedientes.filter((e) => {
      if (filtroEstado !== "TODOS" && e.estado !== filtroEstado) return false;
      if (q && !e.alumnoNombre.toLowerCase().includes(q) && !e.numero.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [expedientes, busqueda, filtroEstado]);

  const seleccionado = filtrados.find((e) => e.id === seleccionadoId) ?? filtrados[0] ?? null;

  const banner = pendientesRevision.length > 0 && (
    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
      <p className="mb-1.5 text-sm font-semibold text-red-800">
        {pendientesRevision.length === 1
          ? "1 alumno/a ha llegado a 3 incidencias — revisa si procede abrir expediente:"
          : `${pendientesRevision.length} alumnos/as han llegado a 3 incidencias — revisa si procede abrir expediente:`}
      </p>
      <div className="flex flex-wrap gap-2">
        {pendientesRevision.map((p) => (
          <span key={p.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-red-700">
            {p.nombre} ({p.curso}) · {p.totalIncidencias}
          </span>
        ))}
      </div>
    </div>
  );

  if (expedientes.length === 0) {
    return (
      <div>
        {banner}
        <div className="mb-5 flex justify-end">
          <AbrirExpedienteWizard alumnos={alumnos} profesores={profesores} />
        </div>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">Todavía no se ha abierto ningún expediente.</p>
          <p className="mt-1 text-xs text-slate-400">
            Puedes abrir uno con el botón de arriba, o desde una incidencia en la pestaña &quot;Incidències&quot;.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {banner}
      <div className="mb-5 flex justify-end">
        <AbrirExpedienteWizard alumnos={alumnos} profesores={profesores} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
        <div>
          <div className="mb-3 flex flex-col gap-2">
            <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar alumno/a o número..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1">
            {(["TODOS", "BORRADOR", "ENVIADO"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFiltroEstado(v)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                  filtroEstado === v ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"
                }`}
              >
                {v === "TODOS" ? "Tots" : v === "BORRADOR" ? "Esborrany" : "Enviat"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filtrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">
              Ningún expediente coincide con la búsqueda.
            </div>
          ) : (
            filtrados.map((e) => (
              <button
                key={e.id}
                onClick={() => setSeleccionadoId(e.id)}
                className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                  seleccionado?.id === e.id ? "border-[#FD5249] bg-[#FFF1F0]" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0B1D4D]">Exp. {e.numero}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      e.estado === "ENVIADO" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {e.estado === "ENVIADO" ? "Enviat" : "Esborrany"}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-600">{e.alumnoNombre}</p>
                <p className="text-[11px] text-slate-400">{e.alumnoCurso} · {e.sancionDias} dies d&apos;expulsió</p>
              </button>
            ))
          )}
        </div>
      </div>

      {seleccionado && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#0B1D4D]">Expedient {seleccionado.numero}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    seleccionado.estado === "ENVIADO" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {seleccionado.estado === "ENVIADO" ? "Enviat" : "Esborrany"}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">{seleccionado.alumnoNombre} · {seleccionado.alumnoCurso}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/expedientes/pdf?id=${seleccionado.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <FileDown className="h-3.5 w-3.5" /> PDF
              </a>
              <a
                href={`/api/expedientes/docx?id=${seleccionado.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <FileText className="h-3.5 w-3.5" /> Word
              </a>
              {seleccionado.esDirectivo && seleccionado.estado !== "ENVIADO" && (
                <>
                  <ExpedienteFormModal
                    incidenciaId={seleccionado.incidenciaId}
                    descripcionInicial={seleccionado.incidenciaDescripcion}
                    expediente={{
                      id: seleccionado.id,
                      sancionDias: seleccionado.sancionDias,
                      sancionMotivo: seleccionado.sancionMotivo,
                      fechaInicio: seleccionado.fechaInicio,
                      fets: seleccionado.fets,
                      testimonis: seleccionado.testimonis,
                      informeTutor: seleccionado.informeTutor,
                      audienciaResumen: seleccionado.audienciaResumen,
                      valoracionComision: seleccionado.valoracionComision,
                      medidasProvisionales: seleccionado.medidasProvisionales,
                      fechaAplicacionInicio: seleccionado.fechaAplicacionInicio,
                      fechaAplicacionFin: seleccionado.fechaAplicacionFin,
                      recursoEstado: seleccionado.recursoEstado,
                      direccionNombre: seleccionado.direccionNombre,
                      coordinadorNombre: seleccionado.coordinadorNombre,
                    }}
                  />
                  <EnviarExpedienteButton expedienteId={seleccionado.id} />
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tutor/a</p>
              <p className="mt-0.5 text-slate-700">{seleccionado.tutorNombre}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Días de expulsión</p>
              <p className="mt-0.5 text-slate-700">{seleccionado.sancionDias}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Motiu</p>
              <p className="mt-0.5 text-slate-700">{seleccionado.sancionMotivo}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Període d&apos;aplicació</p>
              <p className="mt-0.5 text-slate-700">
                {new Date(seleccionado.fechaAplicacionInicio).toLocaleDateString("es-ES")} — {new Date(seleccionado.fechaAplicacionFin).toLocaleDateString("es-ES")}
              </p>
            </div>
            {seleccionado.enviadoEn && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Enviat el</p>
                <p className="mt-0.5 text-slate-700">{new Date(seleccionado.enviadoEn).toLocaleDateString("es-ES")}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
