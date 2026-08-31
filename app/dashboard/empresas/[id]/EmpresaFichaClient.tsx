"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  Phone,
  Mail,
  Users,
  ShieldCheck,
  Pencil,
  FileText,
  Building2,
  GraduationCap,
  Clock,
  CheckCircle2,
  BarChart3,
  ClipboardList,
  User,
  Folder,
  MessageSquare,
  ListChecks,
  Upload,
  Trash2,
  Download,
} from "lucide-react";
import { EmpresaFormModal } from "../EmpresaFormModal";
import { eliminarEmpresa, subirDocumentoEmpresa, eliminarDocumentoEmpresa, anadirObservacionEmpresa } from "../actions";
import { ButtonSpinner } from "../../components/ButtonSpinner";

type EmpresaDetalle = {
  id: string;
  razonSocial: string;
  nombreComercial: string;
  cif: string | null;
  sector: string | null;
  descripcion: string | null;
  anyoFundacion: number | null;
  numEmpleados: number | null;
  tamanoEmpresa: string | null;
  tipoEmpresa: string | null;
  sitioWeb: string | null;
  correoCorporativo: string | null;
  contactoNombre: string | null;
  contactoCargo: string | null;
  contactoEmail: string | null;
  contactoEmailsExtra: string[];
  telefonoDirecto: string | null;
  telefono: string | null;
  direccion: string | null;
  codigoPostal: string | null;
  ciudad: string | null;
  provincia: string | null;
  convenioVigente: boolean;
  convenioInicio: string | null;
  convenioFin: string | null;
  renovableAuto: boolean;
  vacantes: number;
  modalidad: string | null;
  horarioHabitual: string | null;
  ciclosVinculados: string[];
  requisitos: string | null;
  observaciones: string | null;
  estado: string;
  totalConvenios: number;
  creadoPorNombre: string | null;
  createdAt: string;
  updatedAt: string;
  documentos: { id: string; nombre: string; url: string }[];
  historial: { id: string; accion: string; detalle: string | null; usuarioNombre: string; createdAt: string }[];
  notasObservaciones: { id: string; texto: string; usuarioNombre: string; createdAt: string }[];
  alumnosConConvenioActivo: { id: string; practicaAlumnoId: string; alumnoNombre: string; fechaInicio: string | null; fechaFin: string | null }[];
  departamentoId: string | null;
  departamentoNombre: string | null;
};

function fecha(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fechaHora(iso: string) {
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const TABS = [
  { key: "general", label: "Información general", icon: FileText },
  { key: "ciclos", label: "Ciclos vinculados", icon: GraduationCap },
  { key: "plazas", label: "Plazas de prácticas", icon: Users },
  { key: "historial", label: "Historial", icon: Clock },
  { key: "observaciones", label: "Observaciones", icon: MessageSquare },
] as const;

// Los puntos del historial van rotando de color, igual que en el
// historial de Expedientes — así se distingue de un vistazo cada entrada.
const COLORES_PUNTO = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-violet-500"];

function TituloSeccion({ icon: Icon, color, texto }: { icon: React.ElementType; color: string; texto: string }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[#0B1D4D]">
      <span className={`flex h-6 w-6 items-center justify-center rounded-md ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      {texto}
    </h3>
  );
}

export function EmpresaFichaClient({
  empresa,
  puedeEditar,
  schoolId,
}: {
  empresa: EmpresaDetalle;
  puedeEditar: boolean;
  schoolId?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("general");
  const [borrarAbierto, setBorrarAbierto] = useState(false);
  const [textoBorrar, setTextoBorrar] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hrefListado = `/dashboard/empresas${schoolId ? `?school=${schoolId}` : ""}`;
  const competencias = (empresa.requisitos ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const correos = [empresa.contactoEmail, ...empresa.contactoEmailsExtra, empresa.correoCorporativo].filter(Boolean) as string[];

  async function handleEliminar() {
    setBorrando(true);
    setError(null);
    try {
      await eliminarEmpresa(empresa.id, textoBorrar);
      router.push(hrefListado);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setBorrando(false);
    }
  }

  async function handleSubirDocumento(file: File) {
    setSubiendo(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("documento", file);
      await subirDocumentoEmpresa(empresa.id, formData);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el documento.");
    } finally {
      setSubiendo(false);
    }
  }

  async function handleEliminarDocumento(documentoId: string) {
    try {
      await eliminarDocumentoEmpresa(documentoId, empresa.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar el documento.");
    }
  }

  async function handleAnadirNota() {
    if (!nuevaNota.trim()) return;
    setGuardandoNota(true);
    setError(null);
    try {
      await anadirObservacionEmpresa(empresa.id, nuevaNota);
      setNuevaNota("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la nota.");
    } finally {
      setGuardandoNota(false);
    }
  }

  return (
    <div>
      <Link href={hrefListado} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#0B1D4D]">
        <ArrowLeft className="h-4 w-4" /> Volver al listado
      </Link>

      {/* Cabecera */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-500">
            {empresa.nombreComercial.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{empresa.nombreComercial}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${empresa.estado === "ACTIVO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {empresa.estado === "ACTIVO" ? "Activo" : "Inactivo"}
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-slate-400">
              <Building2 className="h-3.5 w-3.5" /> {empresa.sector ?? "Sector sin especificar"}
              {empresa.ciudad && <> · {empresa.ciudad}</>}
            </p>
            {empresa.sitioWeb && (
              <a href={empresa.sitioWeb} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-xs text-[#FD5249] hover:underline">
                <Globe className="h-3 w-3" /> {empresa.sitioWeb}
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-5">
          {empresa.contactoNombre && (
            <div className="text-sm">
              <p className="text-xs font-semibold text-slate-400">Contacto principal</p>
              <p className="font-semibold text-slate-700">{empresa.contactoNombre}</p>
              {(empresa.telefonoDirecto || empresa.telefono) && (
                <p className="flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" /> {empresa.telefonoDirecto ?? empresa.telefono}</p>
              )}
              {correos.map((c) => (
                <p key={c} className="flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" /> {c}</p>
              ))}
            </div>
          )}
          <div className="text-sm">
            <p className="text-xs font-semibold text-slate-400">Plazas de prácticas</p>
            <p className="flex items-center gap-1.5 font-bold text-[#0B1D4D]"><Users className="h-4 w-4 text-slate-400" /> {empresa.vacantes}</p>
          </div>
          {puedeEditar && (
            <div className="flex flex-col gap-2">
              <EmpresaFormModal
                empresaId={empresa.id}
                trigger={
                  <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-500 px-3.5 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">
                    <Pencil className="h-4 w-4" /> Editar empresa
                  </button>
                }
              />
              <button
                onClick={() => {
                  setBorrarAbierto(true);
                  setTextoBorrar("");
                  setError(null);
                }}
                className="text-xs font-semibold text-red-500 hover:underline"
              >
                Eliminar empresa
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pestañas con icono */}
      <div className="mb-5 flex flex-wrap items-center gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key ? "border-[#FD5249] text-[#FD5249]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {tab === "general" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <TituloSeccion icon={FileText} color="bg-blue-50 text-blue-600" texto="Resumen de la empresa" />
              <p className="mb-4 text-sm text-slate-500">{empresa.descripcion ?? "Todavía no hay descripción para esta empresa."}</p>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-400">Año de fundación</dt>
                  <dd className="font-medium text-slate-700">{empresa.anyoFundacion ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Nº de empleados</dt>
                  <dd className="font-medium text-slate-700">{empresa.numEmpleados ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Tamaño</dt>
                  <dd className="font-medium text-slate-700">{empresa.tamanoEmpresa ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Tipo de empresa</dt>
                  <dd className="font-medium text-slate-700">{empresa.tipoEmpresa ?? "—"}</dd>
                </div>
              </dl>
            </div>

            {competencias.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <TituloSeccion icon={ListChecks} color="bg-blue-50 text-blue-600" texto="Perfil y competencias requeridas" />
                <ul className="space-y-1.5">
                  {competencias.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {empresa.contactoNombre && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <TituloSeccion icon={User} color="bg-blue-50 text-blue-600" texto="Tutor / Mentor en la empresa" />
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                    {empresa.contactoNombre.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{empresa.contactoNombre}</p>
                    <p className="text-xs text-slate-400">{empresa.contactoCargo ?? "—"}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                  {correos.map((c) => (
                    <span key={c} className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> {c}</span>
                  ))}
                  {(empresa.telefonoDirecto || empresa.telefono) && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> {empresa.telefonoDirecto ?? empresa.telefono}</span>}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <TituloSeccion icon={BarChart3} color="bg-blue-50 text-blue-600" texto="Resumen rápido" />
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Plazas disponibles</span>
                  <span className="ml-auto font-semibold text-[#0B1D4D]">{empresa.vacantes}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Convenios (Prácticas)</span>
                  <span className="ml-auto font-semibold text-[#0B1D4D]">{empresa.totalConvenios}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Última actualización</span>
                  <span className="ml-auto font-semibold text-[#0B1D4D]">{fecha(empresa.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Documentos</span>
                  <span className="ml-auto font-semibold text-[#0B1D4D]">{empresa.documentos.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <TituloSeccion icon={ShieldCheck} color="bg-emerald-50 text-emerald-600" texto="Estado del convenio" />
              <span className={`mb-3 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${empresa.estado === "ACTIVO" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {empresa.estado === "ACTIVO" ? "Empresa activa" : "Todavía sin alumnado asignado"}
              </span>
              {empresa.alumnosConConvenioActivo.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Pasa a Activa sola en cuanto se le vincula un convenio real desde el módulo Prácticas.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">Alumnado con convenio en curso aquí:</p>
                  {empresa.alumnosConConvenioActivo.map((a) => (
                    <Link
                      key={a.id}
                      href={`/dashboard/practicas/${a.practicaAlumnoId}?convenio=${a.id}`}
                      className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-[#FD5249] hover:bg-red-50"
                    >
                      <span className="font-medium text-slate-700">{a.alumnoNombre}</span>
                      <span className="text-xs text-slate-400">{fecha(a.fechaInicio)} → {fecha(a.fechaFin)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <TituloSeccion icon={Clock} color="bg-blue-50 text-blue-600" texto="Actividad reciente" />
              {empresa.historial.length === 0 ? (
                <p className="text-xs text-slate-400">Todavía no hay actividad registrada.</p>
              ) : (
                <div className="space-y-3">
                  {empresa.historial.slice(0, 4).map((h, i) => (
                    <div key={h.id} className="flex gap-2.5 text-xs">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${COLORES_PUNTO[i % COLORES_PUNTO.length]}`} />
                      <div>
                        <p className="text-slate-400">{fechaHora(h.createdAt)}</p>
                        <p className="font-semibold text-slate-700">{h.accion}{h.detalle && <span className="font-normal text-slate-500"> — {h.detalle}</span>}</p>
                        <p className="text-slate-400">por {h.usuarioNombre}</p>
                      </div>
                    </div>
                  ))}
                  {empresa.historial.length > 4 && (
                    <button onClick={() => setTab("historial")} className="text-xs font-semibold text-[#FD5249] hover:underline">
                      Ver toda la actividad →
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <TituloSeccion icon={Folder} color="bg-blue-50 text-blue-600" texto="Documentos relacionados" />
                {puedeEditar && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={subiendo}
                    className="flex items-center gap-1 text-xs font-semibold text-[#FD5249] hover:underline disabled:opacity-50"
                  >
                    {subiendo ? <ButtonSpinner /> : <Upload className="h-3.5 w-3.5" />} Subir
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSubirDocumento(f);
                  }}
                />
              </div>
              {empresa.documentos.length === 0 ? (
                <p className="text-xs text-slate-400">Todavía no hay documentos subidos para esta empresa.</p>
              ) : (
                <div className="space-y-2">
                  {empresa.documentos.map((d) => (
                    <div key={d.id} className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-600">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="flex-1 truncate">{d.nombre}</span>
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-[#FD5249]">
                        <Download className="h-4 w-4" />
                      </a>
                      {puedeEditar && (
                        <button onClick={() => handleEliminarDocumento(d.id)} className="shrink-0 text-slate-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "ciclos" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <TituloSeccion icon={GraduationCap} color="bg-blue-50 text-blue-600" texto="Ciclos vinculados" />
          {empresa.ciclosVinculados.length === 0 ? (
            <p className="text-sm text-slate-400">Sin ciclos vinculados todavía.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {empresa.ciclosVinculados.map((c) => (
                <span key={c} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{c}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "plazas" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <TituloSeccion icon={ClipboardList} color="bg-blue-50 text-blue-600" texto="Plazas disponibles por ciclo" />
          {empresa.ciclosVinculados.length === 0 ? (
            <p className="text-sm text-slate-400">Esta empresa todavía no tiene ciclos vinculados.</p>
          ) : (
            <div className="space-y-2">
              {empresa.ciclosVinculados.map((c) => (
                <div key={c} className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2.5 text-sm">
                  <span className="text-slate-600">{c}</span>
                  <span className="font-semibold text-[#0B1D4D]">{empresa.vacantes}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-slate-100 px-3.5 pt-3 text-sm font-bold text-[#0B1D4D]">
                <span>Total plazas disponibles</span>
                <span>{empresa.vacantes}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "historial" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <TituloSeccion icon={Clock} color="bg-blue-50 text-blue-600" texto="Historial de cambios" />
          {empresa.historial.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no hay cambios registrados en esta empresa.</p>
          ) : (
            <div className="space-y-4">
              {empresa.historial.map((h, i) => (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLORES_PUNTO[i % COLORES_PUNTO.length]}`} />
                    {i < empresa.historial.length - 1 && <span className="mt-0.5 w-px flex-1 bg-slate-200" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-sm font-semibold text-slate-700">{h.accion}</p>
                    {h.detalle && <p className="text-xs text-slate-500">{h.detalle}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-400">{h.usuarioNombre} · {fechaHora(h.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "observaciones" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <TituloSeccion icon={MessageSquare} color="bg-blue-50 text-blue-600" texto="Observaciones" />

          <div className="mb-4 flex items-start gap-2">
            <textarea
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              rows={2}
              placeholder="Escribe una observación nueva..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#FD5249]"
            />
            <button
              onClick={handleAnadirNota}
              disabled={guardandoNota || !nuevaNota.trim()}
              className="rounded-lg bg-[#FD5249] px-4 py-2 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-50"
            >
              {guardandoNota ? "Guardando..." : "Añadir"}
            </button>
          </div>

          {empresa.notasObservaciones.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no hay observaciones para esta empresa.</p>
          ) : (
            <div className="space-y-3">
              {empresa.notasObservaciones.map((n) => (
                <div key={n.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-2.5">
                  <p className="text-sm text-slate-600">{n.texto}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{n.usuarioNombre} · {fechaHora(n.createdAt)}</p>
                </div>
              ))}
            </div>
          )}

          {empresa.creadoPorNombre && (
            <p className="mt-4 text-xs text-slate-400">Empresa creada por {empresa.creadoPorNombre} el {fecha(empresa.createdAt)}</p>
          )}
        </div>
      )}

      {borrarAbierto && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-6" onClick={() => setBorrarAbierto(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-5">
            <h3 className="mb-2 text-base font-bold text-[#0B1D4D]">¿Seguro que quieres eliminar &quot;{empresa.nombreComercial}&quot;?</h3>
            <p className="mb-4 text-sm text-slate-500">
              Se eliminarán todos los convenios y documentos relacionados con esta empresa. Esta acción no se puede deshacer.
            </p>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Escribe <span className="font-mono text-[#FD5249]">Eliminar {empresa.nombreComercial}</span> para confirmar
            </label>
            <input
              value={textoBorrar}
              onChange={(e) => setTextoBorrar(e.target.value)}
              className="mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400"
            />
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setBorrarAbierto(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                disabled={borrando || textoBorrar.trim() !== `Eliminar ${empresa.nombreComercial}`}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {borrando ? "Eliminando..." : "Eliminar empresa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
