"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X, Trash2, Eye } from "lucide-react";
import {
  obtenerHistoriasActivas,
  crearHistoria,
  marcarHistoriaVista,
  obtenerEspectadores,
  eliminarHistoria,
} from "../historiasActions";
import { ButtonSpinner } from "./ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type HistoriaItem = {
  id: string;
  tipo: string;
  imagenUrl: string;
  texto: string | null;
  autorId: string;
  autorNombre: string;
  createdAt: string;
  vistaPorMi: boolean;
};
type GrupoCentro = {
  schoolId: string;
  schoolName: string;
  schoolLogoUrl: string | null;
  historias: HistoriaItem[];
};

const DURACION_SLIDE_MS = 5000;

function tiempoRelativo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  return `hace ${horas} h`;
}

export function HistoriasBar({
  puedeSubir,
  currentUserId,
  currentUserRole,
  currentUserSchoolId,
}: {
  puedeSubir: boolean;
  currentUserId: string;
  currentUserRole: string;
  currentUserSchoolId: string | null;
}) {
  const { locale } = useLocale();
  const [grupos, setGrupos] = useState<GrupoCentro[]>([]);
  const [cargado, setCargado] = useState(false);
  const [viendoGrupo, setViendoGrupo] = useState<number | null>(null);
  const [subiendoAbierto, setSubiendoAbierto] = useState(false);

  async function cargar() {
    const data = await obtenerHistoriasActivas();
    setGrupos(data);
    setCargado(true);
  }

  useEffect(() => {
    cargar();
  }, []);

  if (!cargado) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0B1D4D]">{translate(locale, "historias.tituloPanel")}</h3>
        {grupos.length > 0 && (
          <span className="text-xs font-semibold text-[#FD5249]">{translate(locale, "historias.verTodas")}</span>
        )}
      </div>

      {grupos.length === 0 ? (
        <p className="text-sm text-slate-400">{translate(locale, "historias.sinHistorias")}</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-1">
          {grupos.map((g, i) => {
            const hayNoVistas = g.historias.some((h) => !h.vistaPorMi);
            return (
              <button key={g.schoolId} onClick={() => setViendoGrupo(i)} className="flex shrink-0 flex-col items-center gap-1.5">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full p-[2px] ${
                    hayNoVistas ? "bg-gradient-to-tr from-[#FD5249] to-violet-500" : "bg-slate-200"
                  }`}
                >
                  <div className="h-full w-full overflow-hidden rounded-full border-2 border-white bg-slate-100">
                    {g.schoolLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.schoolLogoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-400">
                        {g.schoolName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <span className="max-w-[64px] truncate text-[11px] text-slate-500">{g.schoolName}</span>
              </button>
            );
          })}
        </div>
      )}

      {puedeSubir && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-700">{translate(locale, "historias.compartirTitulo")}</div>
              <div className="text-[11px] text-slate-400">{translate(locale, "historias.compartirDescripcion")}</div>
            </div>
          </div>
          <button
            onClick={() => setSubiendoAbierto(true)}
            className="shrink-0 rounded-lg bg-[#FD5249] px-3 py-2 text-xs font-semibold text-white hover:bg-[#D7463E]"
          >
            {translate(locale, "historias.subir")}
          </button>
        </div>
      )}

      {viendoGrupo !== null && (
        <StoryViewer
          grupos={grupos}
          grupoInicial={viendoGrupo}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          currentUserSchoolId={currentUserSchoolId}
          onClose={() => {
            setViendoGrupo(null);
            cargar();
          }}
        />
      )}

      {subiendoAbierto && (
        <SubirHistoriaModal
          onClose={() => {
            setSubiendoAbierto(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function SubirHistoriaModal({ onClose }: { onClose: () => void }) {
  const { locale } = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [esVideo, setEsVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await crearHistoria(formData);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo publicar la historia.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "historias.subir")}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form ref={formRef} action={handleSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-64 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-[#FD5249]"
            >
              {preview ? (
                esVideo ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <video src={preview} className="h-full w-full object-cover" muted playsInline autoPlay loop />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                )
              ) : (
                <span className="text-sm text-slate-400">{translate(locale, "historias.elegirImagen")}</span>
              )}
            </button>
            <input
              ref={fileInputRef}
              name="imagen"
              type="file"
              accept="image/*,video/*"
              required
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setEsVideo(f.type.startsWith("video/"));
                  setPreview(URL.createObjectURL(f));
                }
              }}
              className="hidden"
            />
          </div>

          <div>
            <input
              name="texto"
              placeholder={translate(locale, "historias.textoPlaceholder")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
            />
          </div>

          <p className="text-xs text-slate-400">{translate(locale, "historias.avisoExpira")}</p>

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
              {translate(locale, "historias.publicar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StoryViewer({
  grupos,
  grupoInicial,
  currentUserId,
  currentUserRole,
  currentUserSchoolId,
  onClose,
}: {
  grupos: GrupoCentro[];
  grupoInicial: number;
  currentUserId: string;
  currentUserRole: string;
  currentUserSchoolId: string | null;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const [grupoIdx, setGrupoIdx] = useState(grupoInicial);
  const [slideIdx, setSlideIdx] = useState(0);
  const [progreso, setProgreso] = useState(0);
  const [espectadores, setEspectadores] = useState<{ nombre: string; avatarUrl: string | null; vistoEn: string }[] | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const grupo = grupos[grupoIdx];
  const historia = grupo?.historias[slideIdx];
  const esVideo = historia?.tipo === "VIDEO";
  const puedeEliminar =
    !!historia &&
    (currentUserRole === "SUPERADMIN" ||
      ((currentUserRole === "COORDINADOR" || currentUserRole === "ADMIN_CENTRO") && grupo?.schoolId === currentUserSchoolId) ||
      historia.autorId === currentUserId);

  useEffect(() => {
    if (!historia) return;
    marcarHistoriaVista(historia.id);
    setProgreso(0);
    setEspectadores(null);

    // Los vídeos marcan su propio progreso según van reproduciéndose (ver
    // el <video onTimeUpdate>); las imágenes usan un cronómetro fijo.
    if (esVideo) return;

    const inicio = Date.now();
    intervalRef.current = setInterval(() => {
      const pct = ((Date.now() - inicio) / DURACION_SLIDE_MS) * 100;
      if (pct >= 100) {
        avanzar();
      } else {
        setProgreso(pct);
      }
    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoIdx, slideIdx]);

  function avanzar() {
    if (!grupo) return;
    if (slideIdx < grupo.historias.length - 1) {
      setSlideIdx((s) => s + 1);
    } else if (grupoIdx < grupos.length - 1) {
      setGrupoIdx((g) => g + 1);
      setSlideIdx(0);
    } else {
      onClose();
    }
  }

  function retroceder() {
    if (slideIdx > 0) {
      setSlideIdx((s) => s - 1);
    } else if (grupoIdx > 0) {
      const anterior = grupos[grupoIdx - 1];
      setGrupoIdx((g) => g - 1);
      setSlideIdx(anterior.historias.length - 1);
    }
  }

  async function handleVerEspectadores() {
    if (!historia) return;
    const res = await obtenerEspectadores(historia.id);
    if (res.ok) setEspectadores(res.espectadores);
  }

  async function handleEliminar() {
    if (!historia) return;
    if (!confirm(translate(locale, "historias.confirmEliminar"))) return;
    await eliminarHistoria(historia.id);
    avanzar();
  }

  if (!grupo || !historia) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black">
      <div className="relative flex h-full w-full max-w-md flex-col">
        <div className="absolute left-0 right-0 top-3 z-10 flex gap-1 px-3">
          {grupo.historias.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white transition-all"
                style={{ width: i < slideIdx ? "100%" : i === slideIdx ? `${progreso}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        <div className="absolute left-0 right-0 top-7 z-10 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 overflow-hidden rounded-full bg-slate-700">
              {grupo.schoolLogoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={grupo.schoolLogoUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <span className="text-sm font-semibold text-white">{grupo.schoolName}</span>
            <span className="text-xs text-white/60">{tiempoRelativo(historia.createdAt)}</span>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-white hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex-1">
          {esVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              key={historia.id}
              src={historia.imagenUrl}
              className="h-full w-full object-contain"
              autoPlay
              playsInline
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) setProgreso((v.currentTime / v.duration) * 100);
              }}
              onEnded={avanzar}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={historia.imagenUrl} alt="" className="h-full w-full object-contain" />
          )}
          <button onClick={retroceder} className="absolute left-0 top-0 h-full w-1/3" aria-label="anterior" />
          <button onClick={avanzar} className="absolute right-0 top-0 h-full w-2/3" aria-label="siguiente" />
        </div>

        {historia.texto && (
          <div className="absolute bottom-16 left-0 right-0 px-4 text-center text-sm text-white">{historia.texto}</div>
        )}

        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-4">
          <span className="text-xs text-white/70">{historia.autorNombre}</span>
          <div className="flex items-center gap-2">
            <button onClick={handleVerEspectadores} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/20">
              <Eye className="h-3.5 w-3.5" /> {translate(locale, "historias.verVistas")}
            </button>
            {puedeEliminar && (
              <button onClick={handleEliminar} className="rounded-full bg-white/10 p-1.5 text-white hover:bg-red-500/70">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {espectadores && (
          <div className="absolute inset-x-0 bottom-0 z-20 max-h-[60%] overflow-y-auto rounded-t-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0B1D4D]">
                {translate(locale, "historias.vistoPor")} ({espectadores.length})
              </h3>
              <button onClick={() => setEspectadores(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            {espectadores.length === 0 ? (
              <p className="text-sm text-slate-400">{translate(locale, "historias.sinVistas")}</p>
            ) : (
              <div className="space-y-2">
                {espectadores.map((v, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="h-7 w-7 overflow-hidden rounded-full bg-slate-100">
                      {v.avatarUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.avatarUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span className="text-sm text-slate-700">{v.nombre}</span>
                    <span className="ml-auto text-xs text-slate-400">{tiempoRelativo(v.vistoEn)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
