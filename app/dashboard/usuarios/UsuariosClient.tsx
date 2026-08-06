"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Pencil, MoreVertical, X, Filter, Trash2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { updateUser, deleteUser, getUserDeleteImpact } from "./actions";
import { useLocale, useGuardadoTransition } from "../SchoolContext";
import { translate } from "../i18n";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  ASSIGNABLE_ROLES,
  STATUS_LABELS,
  STATUS_COLORS,
  avatarColor,
  initials,
} from "./constants";

type SchoolOption = { id: string; name: string };

type UserRow = {
  id: string;
  name: string;
  email: string;
  dni: string | null;
  role: string;
  status: string;
  schoolId: string | null;
  schoolName: string | null;
  lastAccessAt: string | null;
  avatarUrl: string | null;
  locale: string;
};

export function UsuariosClient({
  users,
  schools,
  allSchools,
}: {
  users: UserRow[];
  schools: SchoolOption[];
  allSchools?: SchoolOption[];
}) {
  const router = useRouter();
  const { locale } = useLocale();
  // El filtro de arriba usa solo los centros "en juego" en esta vista, pero
  // al editar un usuario individual debe poder reasignarse a CUALQUIER
  // centro, no solo al que se está viendo ahora mismo.
  const editSchools = allSchools ?? schools;
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [blurNames, setBlurNames] = useState(false);
  const [schoolFilter, setSchoolFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isDeleting, startDeleteTransition] = useGuardadoTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<{
    tutorias: number;
    guardias: number;
    material: number;
    alumnos: number;
  } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [loadingImpact, setLoadingImpact] = useState(false);

  async function handleDelete(id: string, name: string) {
    setDeleteError(null);
    setLoadingImpact(true);
    const user = users.find((u) => u.id === id) ?? null;
    setDeleteTarget(user);
    setDeleteConfirmText("");
    try {
      const impact = await getUserDeleteImpact(id);
      setDeleteImpact(impact);
    } catch {
      setDeleteImpact(null);
    } finally {
      setLoadingImpact(false);
    }
  }

  function performDeleteUser() {
    if (!deleteTarget) return;
    startDeleteTransition(async () => {
      try {
        await deleteUser(deleteTarget.id);
        if (editingId === deleteTarget.id) setEditingId(null);
        setDeleteTarget(null);
        router.refresh();
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : "No se pudo eliminar el usuario.");
      }
    });
  }

  const hasImpact =
    deleteImpact &&
    (deleteImpact.tutorias > 0 ||
      deleteImpact.guardias > 0 ||
      deleteImpact.material > 0 ||
      deleteImpact.alumnos > 0);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      if (
        q &&
        !u.name.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q) &&
        !ROLE_LABELS[u.role]?.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (roleFilter !== "Todos" && u.role !== roleFilter) return false;
      if (schoolFilter !== "Todos" && u.schoolId !== schoolFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, schoolFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const editing = users.find((u) => u.id === editingId) ?? null;

  async function handleSave(formData: FormData) {
    setPending(true);
    try {
      await updateUser(formData);
      setEditingId(null);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages =
    totalPages <= 5
      ? pageNumbers
      : page <= 3
      ? [1, 2, 3, "...", totalPages]
      : page >= totalPages - 2
      ? [1, "...", totalPages - 2, totalPages - 1, totalPages]
      : [1, "...", page, "...", totalPages];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-bold text-[#0B1D4D]">Listado de usuarios</h3>

      {deleteError && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
          {deleteError}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={translate(locale, "usuarios.buscarPlaceholder")}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#2F6FED]"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
        >
          <option value="Todos">{translate(locale, "usuarios.todosRoles")}</option>
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>

        {schools.length > 1 && (
          <select
            value={schoolFilter}
            onChange={(e) => {
              setSchoolFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
          >
            <option value="Todos">{translate(locale, "usuarios.todosCentros")}</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <Filter className="h-4 w-4" /> Filtros
        </button>

        <button
          onClick={() => setBlurNames((v) => !v)}
          title="Difuminar nombres de los usuarios"
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            blurNames ? "border-[#2F6FED] bg-blue-50 text-[#2F6FED]" : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {blurNames ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {blurNames ? translate(locale, "usuarios.nombresOcultos") : translate(locale, "usuarios.ocultarNombres")}
        </button>
      </div>

      {paged.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-400">
          No hay usuarios que coincidan con estos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-2 pr-3 font-medium">{translate(locale, "usuarios.colUsuario")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "usuarios.colEmail")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "usuarios.colRol")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "usuarios.colCentro")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "usuarios.colEstado")}</th>
                <th className="pb-2 pr-3 font-medium">{translate(locale, "usuarios.colUltimoAcceso")}</th>
                <th className="pb-2 font-medium">{translate(locale, "usuarios.colAcciones")}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((u) => (
                <tr
                  key={u.id}
                  className={`border-b border-slate-50 last:border-0 ${
                    editingId === u.id ? "bg-blue-50/50" : ""
                  }`}
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold ${avatarColor(
                          u.name
                        )}`}
                      >
                        <span>{initials(u.name).toUpperCase()}</span>
                        {u.avatarUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatarUrl}
                            alt={u.name}
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <div className={`font-semibold text-slate-700 ${blurNames ? "blur-sm select-none" : ""}`}>
                          {u.name}
                        </div>
                        {u.dni && <div className="text-[11px] text-slate-400">DNI: {u.dni}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-slate-500">{u.email}</td>
                  <td className="py-3 pr-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ROLE_COLORS[u.role]}`}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-slate-500">{u.schoolName ?? "—"}</td>
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[u.status]}`} />
                      {STATUS_LABELS[u.status]}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-slate-400">{u.lastAccessAt ?? "—"}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingId(u.id)}
                        title="Editar"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#2F6FED]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Más opciones"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#2F6FED]"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        disabled={isDeleting}
                        title="Eliminar usuario"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          Mostrando {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} a{" "}
          {Math.min(page * pageSize, filtered.length)} de {filtered.length} usuarios
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
          >
            «
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
          >
            ‹
          </button>
          {visiblePages.map((n, i) =>
            n === "..." ? (
              <span key={`dots-${i}`} className="px-1 text-slate-300">
                ...
              </span>
            ) : (
              <button
                key={n}
                onClick={() => setPage(n as number)}
                className={`h-6 w-6 rounded-md ${
                  page === n ? "bg-[#2F6FED] text-white" : "border border-slate-200"
                }`}
              >
                {n}
              </button>
            )
          )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
          >
            ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40"
          >
            »
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="ml-1 rounded-md border border-slate-200 px-2 py-1"
          >
            <option value={5}>5 por página</option>
            <option value={10}>10 por página</option>
            <option value={25}>25 por página</option>
          </select>
        </div>
      </div>

      {/* Modal de edición */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">Editar usuario</h2>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 text-sm font-semibold text-slate-700">
              {editing.name} <span className="font-normal text-slate-400">· {editing.email}</span>
            </div>

            <form action={handleSave} className="space-y-4">
              <input type="hidden" name="id" value={editing.id} />

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Rol</label>
                <select
                  name="role"
                  defaultValue={editing.role}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Centro</label>
                <select
                  name="schoolId"
                  defaultValue={editing.schoolId ?? ""}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                >
                  <option value="">{translate(locale, "usuarios.sinAsignar")}</option>
                  {editSchools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Estado</label>
                <select
                  name="status"
                  defaultValue={editing.status}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-[#2F6FED] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#255ed1] disabled:opacity-60"
                >
                  {pending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: confirmación fuerte para eliminar usuario */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#0B1D4D]">Eliminar usuario</h2>
                {loadingImpact ? (
                  <p className="mt-1 text-sm text-slate-500">Comprobando datos asociados...</p>
                ) : hasImpact ? (
                  <p className="mt-1 text-sm text-slate-600">
                    <strong>{deleteTarget.name}</strong> tiene{" "}
                    {deleteImpact!.tutorias > 0 && <>{deleteImpact!.tutorias} tutoría(s), </>}
                    {deleteImpact!.guardias > 0 && <>{deleteImpact!.guardias} guardia(s), </>}
                    {deleteImpact!.material > 0 && <>{deleteImpact!.material} solicitud(es) de material, </>}
                    {deleteImpact!.alumnos > 0 && <>{deleteImpact!.alumnos} alumno(s)</>}. Si continúas, se
                    eliminará el usuario <strong>y todo lo anterior</strong>, en todos los sitios (historial,
                    calendario, Inicio...). Esta acción no se puede deshacer.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
                    ¿Seguro que quieres eliminar a <strong>{deleteTarget.name}</strong>? Esta acción no se
                    puede deshacer.
                  </p>
                )}
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{deleteError}</div>
            )}

            {hasImpact && (
              <>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Escribe <span className="font-mono text-red-600">eliminar {deleteTarget.name}</span> para
                  confirmar
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
                    ? deleteConfirmText.trim().toLowerCase() !== `eliminar ${deleteTarget.name}`.toLowerCase()
                    : false)
                }
                onClick={performDeleteUser}
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
