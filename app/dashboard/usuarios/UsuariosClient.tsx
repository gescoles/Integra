"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Pencil, MoreVertical, X, Filter, Trash2 } from "lucide-react";
import { updateUser, deleteUser } from "./actions";
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
};

export function UsuariosClient({
  users,
  schools,
}: {
  users: UserRow[];
  schools: SchoolOption[];
}) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [schoolFilter, setSchoolFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete(id: string, name: string) {
    setDeleteError(null);
    if (!confirm(`¿Seguro que quieres eliminar a "${name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    startDeleteTransition(async () => {
      try {
        await deleteUser(id);
        if (editingId === id) setEditingId(null);
      } catch (e) {
        setDeleteError(e instanceof Error ? e.message : "No se pudo eliminar el usuario.");
      }
    });
  }

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
            placeholder="Buscar por nombre, email o rol..."
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
          <option value="Todos">Todos los roles</option>
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>

        <select
          value={schoolFilter}
          onChange={(e) => {
            setSchoolFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2F6FED]"
        >
          <option value="Todos">Todos los centros</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <Filter className="h-4 w-4" /> Filtros
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
                <th className="pb-2 pr-3 font-medium">Usuario</th>
                <th className="pb-2 pr-3 font-medium">Email</th>
                <th className="pb-2 pr-3 font-medium">Rol</th>
                <th className="pb-2 pr-3 font-medium">Centro</th>
                <th className="pb-2 pr-3 font-medium">Estado</th>
                <th className="pb-2 pr-3 font-medium">Último acceso</th>
                <th className="pb-2 font-medium">Acciones</th>
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
                        className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold ${avatarColor(
                          u.name
                        )}`}
                      >
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                        ) : (
                          initials(u.name).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700">{u.name}</div>
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
                  <option value="">Sin asignar</option>
                  {schools.map((s) => (
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
    </div>
  );
}
