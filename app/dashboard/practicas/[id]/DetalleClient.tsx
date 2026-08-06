"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { eliminarConvenio, crearProrroga, eliminarProrroga } from "../actions";
import { ConvenioFormModal } from "./ConvenioFormModal";
import { EditFichaModal } from "./EditFichaModal";
import { ButtonSpinner } from "../../components/ButtonSpinner";
import { useLocale } from "../../SchoolContext";
import { translate } from "../../i18n";

type Prorroga = { id: string; fechaInicio: string | null; fechaFin: string | null; observaciones: string | null };
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

function ProrrogaQuickAdd({ convenioId, fichaId }: { convenioId: string; fichaId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("convenioId", convenioId);
    formData.set("practicaAlumnoId", fichaId);
    setPending(true);
    try {
      await crearProrroga(formData);
      router.refresh();
      setOpen(false);
      formRef.current?.reset();
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#2F6FED] hover:underline"
      >
        <Plus className="h-3 w-3" /> {translate(locale, "practicas.nuevaProrroga")}
      </button>
    );
  }

  return (
    <form ref={formRef} action={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2.5">
      <div>
        <label className="mb-1 block text-[10px] font-semibold text-slate-500">{translate(locale, "practicas.fechaInicio")}</label>
        <input name="fechaInicio" type="date" className="rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2F6FED]" />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold text-slate-500">{translate(locale, "practicas.fechaFin")}</label>
        <input name="fechaFin" type="date" className="rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2F6FED]" />
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="mb-1 block text-[10px] font-semibold text-slate-500">{translate(locale, "salidas.observaciones")}</label>
        <input name="observaciones" className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-[#2F6FED]" />
      </div>
      <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-white">
        {translate(locale, "common.cancelar")}
      </button>
      <button type="submit" disabled={pending} className="inline-flex items-center gap-1 rounded-md bg-[#2F6FED] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60">
        {pending && <ButtonSpinner />}
        {translate(locale, "common.guardar")}
      </button>
    </form>
  );
}

function ConvenioCard({ convenio, fichaId }: { convenio: Convenio; fichaId: string }) {
  const { locale } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(true);

  function handleDelete() {
    if (!confirm(translate(locale, "practicas.confirmEliminarConvenio"))) return;
    startTransition(async () => {
      await eliminarConvenio(convenio.id, fichaId);
      router.refresh();
    });
  }

  function handleDeleteProrroga(id: string) {
    if (!confirm(translate(locale, "practicas.confirmEliminarProrroga"))) return;
    startTransition(async () => {
      await eliminarProrroga(id, fichaId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
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
            </div>
            <p className="ml-6 text-xs text-slate-400">
              {convenio.tipologia ?? "—"} · {convenio.estadoAcuerdo ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ConvenioFormModal fichaId={fichaId} convenio={convenio} />
          <button onClick={handleDelete} disabled={isPending} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
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

          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              {translate(locale, "practicas.prorrogas")} ({convenio.prorrogas.length})
            </div>
            {convenio.prorrogas.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {convenio.prorrogas.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <span className="text-slate-600">
                      {fmt(p.fechaInicio)} – {fmt(p.fechaFin)}
                      {p.observaciones && <span className="text-slate-400"> · {p.observaciones}</span>}
                    </span>
                    <button onClick={() => handleDeleteProrroga(p.id)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <ProrrogaQuickAdd convenioId={convenio.id} fichaId={fichaId} />
          </div>
        </>
      )}
    </div>
  );
}

export function DetalleClient({
  ficha,
  convenios,
  profesores,
}: {
  ficha: Ficha;
  convenios: Convenio[];
  profesores: { id: string; name: string }[];
}) {
  const { locale } = useLocale();

  return (
    <div className="space-y-6">
      <Link href="/dashboard/practicas" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#2F6FED]">
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
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ficha.promocion === "PRIMERA" ? "bg-blue-50 text-[#2F6FED]" : "bg-violet-50 text-violet-600"}`}>
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
              <ConvenioCard key={c.id} convenio={c} fichaId={ficha.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
