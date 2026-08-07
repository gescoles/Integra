"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Award,
} from "lucide-react";
import { eliminarConvenio, eliminarProrroga } from "../actions";
import { ConvenioFormModal } from "./ConvenioFormModal";
import { ProrrogaFormModal } from "./ProrrogaFormModal";
import { CerrarConvenioModal } from "./CerrarConvenioModal";
import { TutoriaSeguimientoBlock } from "./TutoriaSeguimientoBlock";
import { EditFichaModal } from "./EditFichaModal";
import { useLocale, useGuardadoTransition } from "../../SchoolContext";
import { translate } from "../../i18n";

type Tutoria = { id: string; tipo: string; fecha: string | null; resumen: string | null; medioContacto: string | null };
type Prorroga = {
  id: string;
  tipologia: string | null;
  estadoAcuerdo: string | null;
  convalida: boolean;
  quienAltaBajaSS: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  periodo: string | null;
  empresaCif: string | null;
  empresaNombre: string | null;
  tutorEmpresaNombre: string | null;
  tutorEmpresaTelefono: string | null;
  tutorEmpresaCorreo: string | null;
  observaciones: string | null;
};
type Convenio = {
  id: string;
  tipologia: string | null;
  estadoAcuerdo: string | null;
  convalida: boolean;
  quienAltaBajaSS: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  periodo: string | null;
  empresaCif: string | null;
  empresaNombre: string | null;
  tutorEmpresaNombre: string | null;
  tutorEmpresaTelefono: string | null;
  tutorEmpresaCorreo: string | null;
  observaciones: string | null;
  cerrado: boolean;
  notaFinal: string | null;
  fechaCierre: string | null;
  cerradoPorNombre: string | null;
  tutoriasSeguimiento: Tutoria[];
  prorrogas: Prorroga[];
};
type Ficha = {
  id: string;
  alumnoNombre: string;
  alumnoCurso: string;
  alumnoAvatarUrl: string | null;
  promocion: string;
  cicloFormativo: string | null;
  anyTitulacion: string | null;
  tutorImesId: string | null;
  tutorImesNombre: string | null;
  dni: string | null;
  fechaNacimiento: string | null;
  telefono: string | null;
  direccion: string | null;
  correoAlumno: string | null;
  cap: string | null;
  nuss: string | null;
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-ES") : "—");

function ProrrogaCard({ prorroga, fichaId, convenioId }: { prorroga: Prorroga; fichaId: string; convenioId: string }) {
  const { locale } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useGuardadoTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm(translate(locale, "practicas.confirmEliminarProrroga"))) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarProrroga(prorroga.id, fichaId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-slate-600">
            {fmt(prorroga.fechaInicio)} – {fmt(prorroga.fechaFin)}
          </div>
          <div className="text-xs text-slate-400">
            {prorroga.empresaNombre ?? translate(locale, "practicas.sinEmpresa")}
            {prorroga.tipologia && ` · ${prorroga.tipologia}`}
          </div>
          {prorroga.observaciones && <p className="mt-1 text-xs text-slate-500">{prorroga.observaciones}</p>}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ProrrogaFormModal fichaId={fichaId} convenioId={convenioId} prorroga={prorroga} />
          <button onClick={handleDelete} disabled={isPending} className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ConvenioCard({ convenio, fichaId, esDirectivo }: { convenio: Convenio; fichaId: string; esDirectivo: boolean }) {
  const { locale } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useGuardadoTransition();
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tiposHechos = new Set(convenio.tutoriasSeguimiento.map((t) => t.tipo));
  const faltanTutorias = (["INICIAL", "MEDIA", "FINAL"] as const).filter((t) => !tiposHechos.has(t));
  const soloLectura = convenio.cerrado && !esDirectivo;

  function handleDelete() {
    if (!confirm(translate(locale, "practicas.confirmEliminarConvenio"))) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarConvenio(convenio.id, fichaId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar el convenio.");
      }
    });
  }

  return (
    <div className={`rounded-2xl border bg-white p-5 ${convenio.cerrado ? "border-emerald-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded((v) => !v)} className="text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-bold text-[#0B1D4D]">{convenio.empresaNombre ?? translate(locale, "practicas.sinEmpresa")}</h3>
              {convenio.convalida && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {translate(locale, "practicas.convalida")}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  convenio.cerrado ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-[#FD5249]"
                }`}
              >
                {convenio.cerrado ? translate(locale, "practicas.cerradoEstado") : translate(locale, "practicas.enCurso")}
              </span>
            </div>
            <p className="ml-6 text-xs text-slate-400">
              {convenio.tipologia ?? "—"} · {convenio.estadoAcuerdo ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!soloLectura && <ConvenioFormModal fichaId={fichaId} convenio={convenio} />}
          <button onClick={handleDelete} disabled={isPending} title={translate(locale, "common.eliminar")} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}

      {/* Nota final / cierre: siempre visible, aunque la tarjeta esté
          colapsada, para que nunca "desaparezca" el botón de cerrar. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div>
          {convenio.notaFinal && (
            <div className="flex items-center gap-1.5 text-sm">
              <Award className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-slate-700">{translate(locale, "practicas.notaFinal")}:</span>
              <span className="text-slate-600">{convenio.notaFinal}</span>
            </div>
          )}
          {convenio.cerrado && convenio.fechaCierre && (
            <p className="mt-0.5 text-xs text-slate-400">
              {translate(locale, "practicas.cerradoPor")} {convenio.cerradoPorNombre ?? "—"} · {fmt(convenio.fechaCierre)}
            </p>
          )}
        </div>
        <CerrarConvenioModal
          fichaId={fichaId}
          convenioId={convenio.id}
          cerrado={convenio.cerrado}
          notaFinal={convenio.notaFinal}
          fechaCierre={convenio.fechaCierre}
          esDirectivo={esDirectivo}
          faltanTutorias={faltanTutorias}
        />
      </div>

      {expanded && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600 sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>{fmt(convenio.fechaInicio)} – {fmt(convenio.fechaFin)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "practicas.periodo")}</div>
              <div>{convenio.periodo ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "practicas.tutorEmpresaNombre")}</div>
              <div>{convenio.tutorEmpresaNombre ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "practicas.empresaCif")}</div>
              <div>{convenio.empresaCif ?? "—"}</div>
            </div>
          </div>

          {convenio.observaciones && (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{convenio.observaciones}</p>
          )}

          {/* Tutorías de seguimiento */}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <TutoriaSeguimientoBlock
              convenioId={convenio.id}
              fichaId={fichaId}
              tutorias={convenio.tutoriasSeguimiento}
              bloqueado={soloLectura}
            />
          </div>

          {/* Prórrogas */}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {translate(locale, "practicas.prorrogas")} ({convenio.prorrogas.length})
              </div>
              {!soloLectura && <ProrrogaFormModal fichaId={fichaId} convenioId={convenio.id} />}
            </div>
            {convenio.prorrogas.length > 0 && (
              <div className="space-y-1.5">
                {convenio.prorrogas.map((p) => (
                  <ProrrogaCard key={p.id} prorroga={p} fichaId={fichaId} convenioId={convenio.id} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function DetalleClient({
  ficha,
  convenios,
  esDirectivo,
}: {
  ficha: Ficha;
  convenios: Convenio[];
  esDirectivo: boolean;
}) {
  const { locale } = useLocale();

  return (
    <div className="space-y-6">
      <Link href="/dashboard/practicas" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#FD5249]">
        <ArrowLeft className="h-3.5 w-3.5" /> {translate(locale, "practicas.title")}
      </Link>

      {/* Ficha del alumno */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
              {ficha.alumnoAvatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ficha.alumnoAvatarUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B1D4D]">{ficha.alumnoNombre}</h2>
              <p className="text-xs text-slate-400">{ficha.alumnoCurso}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ficha.promocion === "PRIMERA" ? "bg-blue-50 text-[#FD5249]" : "bg-violet-50 text-violet-600"}`}>
              {ficha.promocion === "PRIMERA" ? translate(locale, "practicas.primeraPromocion") : translate(locale, "practicas.segundaPromocion")}
            </span>
          </div>
          <EditFichaModal ficha={ficha} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "practicas.cicloFormativo")}</div>
            <div className="text-slate-600">{ficha.cicloFormativo ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "practicas.tutorImes")}</div>
            <div className="text-slate-600">{ficha.tutorImesNombre ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "practicas.dni")}</div>
            <div className="text-slate-600">{ficha.dni ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "practicas.telefono")}</div>
            <div className="text-slate-600">{ficha.telefono ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "practicas.correoAlumno")}</div>
            <div className="text-slate-600">{ficha.correoAlumno ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "practicas.nuss")}</div>
            <div className="text-slate-600">{ficha.nuss ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "practicas.cap")}</div>
            <div className="text-slate-600">{ficha.cap ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">{translate(locale, "practicas.direccion")}</div>
            <div className="text-slate-600">{ficha.direccion ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Convenios */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0B1D4D]">
            {translate(locale, "practicas.convenios")} ({convenios.length})
          </h2>
          <ConvenioFormModal fichaId={ficha.id} />
        </div>

        {convenios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">
            {translate(locale, "practicas.sinConvenios")}
          </div>
        ) : (
          <div className="space-y-4">
            {convenios.map((c) => (
              <ConvenioCard key={c.id} convenio={c} fichaId={ficha.id} esDirectivo={esDirectivo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
