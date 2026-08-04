"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Search,
  RefreshCw,
  Eye,
  MoreVertical,
  Pencil,
  Zap,
  Trash2,
  AlertTriangle,
  EyeOff,
} from "lucide-react";
import { saveSchoolSettings, deleteSchool, uploadSchoolLogo, getSchoolDeleteImpact } from "./actions";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";
import {
  MODULES,
  PLAN_LABELS,
  TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "./constants";
import { Image as ImageIcon } from "lucide-react";

type SchoolRow = {
  id: string;
  name: string;
  type: string;
  city: string | null;
  plan: string;
  status: string;
  userLimit: number;
  modules: string[];
  userCount: number;
  updatedAt: string;
  logoUrl: string | null;
};

export function CentrosClient({ schools }: { schools: SchoolRow[] }) {
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  const [blurNames, setBlurNames] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState("Todos");
  const [planFilter, setPlanFilter] = useState("Todos");
  const [moduloFilter, setModuloFilter] = useState("Todos");
  const [ciudadFilter, setCiudadFilter] = useState("Todas");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isUploadingLogo, startLogoTransition] = useTransition();
  const [logoError, setLogoError] = useState<string | null>(null);

  function handleLogoUpload(schoolId: string, file: File) {
    setLogoError(null);
    const formData = new FormData();
    formData.set("schoolId", schoolId);
    formData.set("logo", file);
    startLogoTransition(async () => {
      try {
        await uploadSchoolLogo(formData);
      } catch (e) {
        setLogoError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
      }
    });
  }

  const [deleteTarget, setDeleteTarget] = useState<SchoolRow | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<{
    usuarios: number;
    tutorias: number;
    guardias: number;
    material: number;
    alumnos: number;
    avisos: number;
  } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [loadingImpact, setLoadingImpact] = useState(false);

  async function handleDelete(id: string, name: string) {
    setDeleteError(null);
    setLoadingImpact(true);
    const school = schools.find((s) => s.id === id) ?? null;
    setDeleteTarget(school);
    setDeleteConfirmText("");
    try {
      const impact = await getSchoolDeleteImpact(id);
      setDeleteImpact(impact);
    } catch {
      setDeleteImpact(null);
    } finally {
      setLoadingImpact(false);
    }
  }

  function performDeleteSchool() {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      try {
        await deleteSchool(deleteTarget.id);
        if (selectedId === deleteTarget.id) setSelectedId(null);
        setDeleteTarget(null);
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : "No se pudo eliminar el centro.");
      }
    });
  }

  const hasImpact =
    deleteImpact &&
    (deleteImpact.usuarios > 0 ||
      deleteImpact.tutorias > 0 ||
      deleteImpact.guardias > 0 ||
      deleteImpact.material > 0 ||
      deleteImpact.alumnos > 0 ||
      deleteImpact.avisos > 0);

  const cities = useMemo(
    () => Array.from(new Set(schools.map((s) => s.city).filter(Boolean))) as string[],
    [schools]
  );

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (estadoFilter !== "Todos" && s.status !== estadoFilter) return false;
      if (planFilter !== "Todos" && s.plan !== planFilter) return false;
      if (moduloFilter !== "Todos" && !s.modules.includes(moduloFilter)) return false;
      if (ciudadFilter !== "Todas" && s.city !== ciudadFilter) return false;
      return true;
    });
  }, [schools, search, estadoFilter, planFilter, moduloFilter, ciudadFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selected = schools.find((s) => s.id === selectedId) ?? null;

  function clearFilters() {
    setSearch("");
    setEstadoFilter("Todos");
    setPlanFilter("Todos");
    setModuloFilter("Todos");
    setCiudadFilter("Todas");
    setPage(1);
  }

  async function handleSave(formData: FormData) {
    setPending(true);
    setSaveError(null);
    try {
      await saveSchoolSettings(formData);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "No se pudo guardar. Inténtalo de nuevo."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* Lista de centros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-bold text-[#0B1D4D]">Lista de centros</h3>

        {deleteError && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
            {deleteError}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="relative sm:col-span-3 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={translate(locale, "centros.buscarPlaceholder")}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-[#2F6FED]"
            />
          </div>

          <select
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-[#2F6FED]"
          >
            <option>Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-[#2F6FED]"
          >
            <option>Todos</option>
            {Object.entries(PLAN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={moduloFilter}
            onChange={(e) => {
              setModuloFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-[#2F6FED]"
          >
            <option>Todos</option>
            {MODULES.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <select
              value={ciudadFilter}
              onChange={(e) => {
                setCiudadFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:border-[#2F6FED]"
            >
              <option>Todas</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={clearFilters}
              title="Limpiar filtros"
              className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setBlurNames((v) => !v)}
              title="Difuminar nombres de los centros"
              className={`shrink-0 rounded-lg border p-2 ${
                blurNames ? "border-[#2F6FED] bg-blue-50 text-[#2F6FED]" : "border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {blurNames ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {paged.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
            No hay centros que coincidan con estos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="pb-2 pr-3 font-medium">{translate(locale, "centros.colCentro")}</th>
                  <th className="pb-2 pr-3 font-medium">{translate(locale, "centros.colTipo")}</th>
                  <th className="pb-2 pr-3 font-medium">{translate(locale, "centros.colPlan")}</th>
                  <th className="pb-2 pr-3 font-medium">{translate(locale, "centros.colModulos")}</th>
                  <th className="pb-2 pr-3 font-medium">{translate(locale, "centros.colUsuarios")}</th>
                  <th className="pb-2 pr-3 font-medium">{translate(locale, "centros.colEstado")}</th>
                  <th className="pb-2 pr-3 font-medium">{translate(locale, "centros.colActualizado")}</th>
                  <th className="pb-2 font-medium">{translate(locale, "centros.colAcciones")}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => {
                  const pct = s.userLimit > 0 ? Math.min(100, Math.round((s.userCount / s.userLimit) * 100)) : 0;
                  return (
                    <tr
                      key={s.id}
                      className={`border-b border-slate-50 last:border-0 ${
                        selectedId === s.id ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <td className="py-3 pr-3">
                        <div className={`font-semibold text-slate-700 ${blurNames ? "blur-sm select-none" : ""}`}>
                          {s.name}
                        </div>
                        {s.city && <div className="text-[11px] text-slate-400">{s.city}</div>}
                      </td>
                      <td className="py-3 pr-3 text-slate-500">{TYPE_LABELS[s.type]}</td>
                      <td className="py-3 pr-3 text-slate-500">{PLAN_LABELS[s.plan]}</td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {s.modules.length === 0 && <span className="text-slate-300">—</span>}
                          {s.modules.map((key) => {
                            const mod = MODULES.find((m) => m.key === key);
                            if (!mod) return null;
                            return (
                              <span
                                key={key}
                                title={mod.label}
                                className={`flex h-6 w-6 items-center justify-center rounded-md border ${mod.color}`}
                              >
                                <mod.icon className="h-3.5 w-3.5" />
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="text-slate-500">
                          {s.userCount} / {s.userLimit}
                        </div>
                        <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-[#2F6FED]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[s.status]}`} />
                          {STATUS_LABELS[s.status]}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-400">{s.updatedAt}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedId(s.id);
                              setSaveError(null);
                            }}
                            title="Edición rápida"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#2F6FED]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Ver detalle"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#2F6FED]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            disabled={isDeleting}
                            title="Eliminar centro"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Más opciones"
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#2F6FED]"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Mostrando {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} a{" "}
            {Math.min(page * pageSize, filtered.length)} de {filtered.length} centros
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(0, 5)
              .map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-6 w-6 rounded-md ${
                    page === n ? "bg-[#2F6FED] text-white" : "border border-slate-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              →
            </button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-md border border-slate-200 px-2 py-1"
            >
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>
        </div>
      </div>

      {/* Edición rápida */}
      <div className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#2F6FED]" />
          <h3 className="text-sm font-bold text-[#0B1D4D]">Edición rápida</h3>
        </div>

        {!selected ? (
          <p className="text-xs text-slate-400">
            Selecciona un centro de la lista (icono de lápiz) para modificar su
            plan, módulos, estado y límite de usuarios.
          </p>
        ) : (
          <form key={selected.id} action={handleSave} className="space-y-4">
            <input type="hidden" name="id" value={selected.id} />
            <div className="text-sm font-semibold text-slate-700">{selected.name}</div>

            {/* Foto del centro — se sube al instante, aparte del resto del formulario */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Foto del centro
              </label>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {selected.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.logoUrl} alt={selected.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-slate-300" />
                  )}
                </div>
                <label className="flex-1 cursor-pointer rounded-lg border border-dashed border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-500 hover:border-[#2F6FED] hover:text-[#2F6FED]">
                  {isUploadingLogo ? "Subiendo..." : "Cambiar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingLogo}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(selected.id, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {logoError && <p className="mt-1.5 text-[11px] text-red-600">{logoError}</p>}
            </div>

            {saveError && (
              <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-600">
                {saveError}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Plan</label>
              <select
                name="plan"
                defaultValue={selected.plan}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
              >
                {Object.entries(PLAN_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                Límite de usuarios
              </label>
              <input
                name="userLimit"
                type="number"
                min={1}
                defaultValue={selected.userLimit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">Módulos</label>
              <div className="flex flex-wrap gap-2">
                {MODULES.map((m) => (
                  <label
                    key={m.key}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${m.color}`}
                  >
                    <input
                      type="checkbox"
                      name="modules"
                      value={m.key}
                      defaultChecked={selected.modules.includes(m.key)}
                      className="accent-current"
                    />
                    <m.icon className="h-3.5 w-3.5" />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Estado</label>
              <select
                name="status"
                defaultValue={selected.status}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-[#2F6FED] py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60"
            >
              {pending ? "Guardando..." : "Guardar cambios"}
            </button>

            <p className="rounded-lg bg-blue-50 p-3 text-[11px] text-slate-500">
              Los cambios se aplicarán de inmediato y quedarán registrados en la
              auditoría.
            </p>
          </form>
        )}
      </div>

      {/* Modal: confirmación fuerte para eliminar centro */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0B1D4D]">Eliminar centro</h2>
                {loadingImpact ? (
                  <p className="mt-1 text-sm text-slate-500">Comprobando datos asociados...</p>
                ) : hasImpact ? (
                  <p className="mt-1 text-sm text-slate-600">
                    <strong>{deleteTarget.name}</strong> tiene{" "}
                    {deleteImpact!.usuarios > 0 && <>{deleteImpact!.usuarios} usuario(s), </>}
                    {deleteImpact!.tutorias > 0 && <>{deleteImpact!.tutorias} tutoría(s), </>}
                    {deleteImpact!.guardias > 0 && <>{deleteImpact!.guardias} guardia(s), </>}
                    {deleteImpact!.material > 0 && <>{deleteImpact!.material} solicitud(es) de material, </>}
                    {deleteImpact!.alumnos > 0 && <>{deleteImpact!.alumnos} alumno(s), </>}
                    {deleteImpact!.avisos > 0 && <>{deleteImpact!.avisos} aviso(s)</>}. Si continúas, se
                    eliminará el centro <strong>y todo lo anterior</strong>, sin excepción. Esta acción no
                    se puede deshacer.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
                    ¿Seguro que quieres eliminar el centro <strong>{deleteTarget.name}</strong>? Esta
                    acción no se puede deshacer.
                  </p>
                )}
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {deleteError}
              </div>
            )}

            {hasImpact && (
              <>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Escribe <span className="font-mono text-red-600">eliminar {deleteTarget.name}</span>{" "}
                  para confirmar
                </label>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={`eliminar ${deleteTarget.name}`}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-red-400"
                />
              </>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isDeleting ||
                  loadingImpact ||
                  (hasImpact
                    ? deleteConfirmText.trim().toLowerCase() !==
                      `eliminar ${deleteTarget.name}`.toLowerCase()
                    : false)
                }
                onClick={performDeleteSchool}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
