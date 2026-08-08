"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Folder,
  FolderPlus,
  Upload,
  File as FileIcon,
  Trash2,
  X,
  ArrowLeft,
  Download,
} from "lucide-react";
import { crearCarpeta, eliminarCarpeta, subirArchivo, eliminarArchivo } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale, useGuardadoTransition } from "../SchoolContext";
import { translate } from "../i18n";

type Archivo = {
  id: string;
  nombre: string;
  url: string;
  tipo: string | null;
  tamano: number | null;
  subidoPorNombre: string | null;
  createdAt: string;
};
type Carpeta = {
  id: string;
  nombre: string;
  creadoPorNombre: string | null;
  createdAt: string;
  archivos: Archivo[];
};

function fmtTamano(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OnboardingClient({
  carpetas,
  esDirectivo,
  schoolId,
}: {
  carpetas: Carpeta[];
  esDirectivo: boolean;
  schoolId: string;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [carpetaAbiertaId, setCarpetaAbiertaId] = useState<string | null>(null);
  const [nuevaCarpetaAbierta, setNuevaCarpetaAbierta] = useState(false);
  const [isPending, startTransition] = useGuardadoTransition();
  const [error, setError] = useState<string | null>(null);

  const carpetaAbierta = useMemo(() => carpetas.find((c) => c.id === carpetaAbiertaId) ?? null, [carpetas, carpetaAbiertaId]);

  function handleEliminarCarpeta(c: Carpeta) {
    if (!confirm(`${translate(locale, "onboarding.confirmEliminarCarpeta")} "${c.nombre}"? ${translate(locale, "onboarding.confirmEliminarCarpetaAviso")}`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarCarpeta(c.id);
        setCarpetaAbiertaId(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  function handleEliminarArchivo(a: Archivo) {
    if (!confirm(`${translate(locale, "onboarding.confirmEliminarArchivo")} "${a.nombre}"?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await eliminarArchivo(a.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo eliminar.");
      }
    });
  }

  if (carpetaAbierta) {
    return (
      <div>
        <button
          onClick={() => setCarpetaAbiertaId(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#FD5249]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {translate(locale, "onboarding.title")}
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                <Folder className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#0B1D4D]">{carpetaAbierta.nombre}</h2>
                <p className="text-xs text-slate-400">
                  {carpetaAbierta.archivos.length} {translate(locale, "onboarding.archivos")}
                </p>
              </div>
            </div>
            {esDirectivo && (
              <div className="flex items-center gap-2">
                <SubirArchivoModal carpetaId={carpetaAbierta.id} />
                <button
                  onClick={() => handleEliminarCarpeta(carpetaAbierta)}
                  disabled={isPending}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title={translate(locale, "onboarding.eliminarCarpeta")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

          {carpetaAbierta.archivos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
              {translate(locale, "onboarding.sinArchivos")}
            </div>
          ) : (
            <div className="space-y-2">
              {carpetaAbierta.archivos.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                    <FileIcon className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-700">{a.nombre}</div>
                    <div className="text-xs text-slate-400">
                      {a.subidoPorNombre} · {new Date(a.createdAt).toLocaleDateString("es-ES")}
                      {a.tamano ? ` · ${fmtTamano(a.tamano)}` : ""}
                    </div>
                  </div>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-[#FD5249]"
                    title={translate(locale, "onboarding.descargar")}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  {esDirectivo && (
                    <button
                      onClick={() => handleEliminarArchivo(a)}
                      disabled={isPending}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {esDirectivo && (
        <div className="mb-5 flex justify-end">
          <button
            onClick={() => setNuevaCarpetaAbierta(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
          >
            <FolderPlus className="h-4 w-4" /> {translate(locale, "onboarding.nuevaCarpeta")}
          </button>
        </div>
      )}

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

      {carpetas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center text-sm text-slate-400">
          {translate(locale, "onboarding.sinCarpetas")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {carpetas.map((c) => (
            <button
              key={c.id}
              onClick={() => setCarpetaAbiertaId(c.id)}
              className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-[#FD5249]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
                <Folder className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-700">{c.nombre}</div>
                <div className="text-xs text-slate-400">
                  {c.archivos.length} {translate(locale, "onboarding.archivos")}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {nuevaCarpetaAbierta && (
        <NuevaCarpetaModal schoolId={schoolId} onClose={() => setNuevaCarpetaAbierta(false)} />
      )}
    </div>
  );
}

function NuevaCarpetaModal({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("schoolId", schoolId);
    setPending(true);
    setError(null);
    try {
      await crearCarpeta(formData);
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la carpeta.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "onboarding.nuevaCarpeta")}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form action={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "onboarding.nombreCarpeta")}</label>
            <input name="nombre" required autoFocus className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              {translate(locale, "common.cancelar")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
            >
              {pending && <ButtonSpinner />}
              {translate(locale, "common.guardar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubirArchivoModal({ carpetaId }: { carpetaId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("carpetaId", carpetaId);
    setPending(true);
    setError(null);
    try {
      await subirArchivo(formData);
      router.refresh();
      setOpen(false);
      setNombreArchivo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-3 py-2 text-sm font-semibold text-white hover:bg-[#D7463E]"
      >
        <Upload className="h-4 w-4" /> {translate(locale, "onboarding.subirArchivo")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "onboarding.subirArchivo")}</h2>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form action={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-[#FD5249]"
              >
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-500">{nombreArchivo ?? translate(locale, "onboarding.elegirArchivo")}</span>
              </button>
              <input
                ref={fileInputRef}
                name="archivo"
                type="file"
                required
                onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? null)}
                className="hidden"
              />
              <p className="text-xs text-slate-400">{translate(locale, "onboarding.avisoNotificacion")}</p>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {translate(locale, "common.cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />}
                  {translate(locale, "onboarding.subir")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
