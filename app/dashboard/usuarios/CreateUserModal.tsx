"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Building2, Users } from "lucide-react";
import { createUser } from "./actions";
import { obtenerDepartamentos, crearDepartamento } from "./departamentosActions";
import { ROLE_LABELS, ASSIGNABLE_ROLES } from "./constants";
import { ButtonSpinner } from "../components/ButtonSpinner";

type SchoolOption = { id: string; name: string };
type DepartamentoOption = { id: string; nombre: string; coordinadores: { id: string; nombre: string }[] };

export function CreateUserModal({ schools }: { schools: SchoolOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoPassword, setAutoPassword] = useState(false);
  const [loginMicrosoft, setLoginMicrosoft] = useState(false);
  const [role, setRole] = useState("PROFESOR");
  const [schoolId, setSchoolId] = useState(schools[0]?.id ?? "");
  const [departamentos, setDepartamentos] = useState<DepartamentoOption[]>([]);
  const [departamentoIds, setDepartamentoIds] = useState<string[]>([]);
  const [nuevoDepartamento, setNuevoDepartamento] = useState("");
  const [creandoDepartamento, setCreandoDepartamento] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!schoolId) {
      setDepartamentos([]);
      return;
    }
    obtenerDepartamentos(schoolId).then(setDepartamentos);
  }, [schoolId]);

  function toggleDepartamento(id: string) {
    setDepartamentoIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  async function handleCrearDepartamento() {
    if (!nuevoDepartamento.trim() || !schoolId) return;
    setCreandoDepartamento(true);
    try {
      const formData = new FormData();
      formData.set("schoolId", schoolId);
      formData.set("nombre", nuevoDepartamento.trim());
      await crearDepartamento(formData);
      const actualizados = await obtenerDepartamentos(schoolId);
      setDepartamentos(actualizados);
      setNuevoDepartamento("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el departamento.");
    } finally {
      setCreandoDepartamento(false);
    }
  }

  // Coordinador(es) calculados automáticamente a partir de los
  // departamentos elegidos para un profesor (sin duplicados).
  const coordinadoresCalculados = departamentos
    .filter((d) => departamentoIds.includes(d.id))
    .flatMap((d) => d.coordinadores)
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    departamentoIds.forEach((id) => formData.append("departamentoIds", id));
    try {
      await createUser(formData);
      setOpen(false);
      formRef.current?.reset();
      setDepartamentoIds([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el usuario.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
      >
        <Plus className="h-4 w-4" /> Nuevo usuario
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">Crear usuario</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Nombre completo
                  </label>
                  <input
                    name="name"
                    required
                    placeholder="Ej. Marta Rodríguez"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    DNI
                  </label>
                  <input
                    name="dni"
                    placeholder="Ej. 45678912X"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="nombre@centro.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div>
                <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    name="loginMicrosoft"
                    checked={loginMicrosoft}
                    onChange={(e) => setLoginMicrosoft(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#FD5249]"
                  />
                  <span>
                    <strong>Inicio de sesión con Microsoft/Teams.</strong> No hace falta poner
                    contraseña — le llegará un correo para entrar directamente con su cuenta de
                    Microsoft (tiene que ser exactamente el email que pongas arriba).
                  </span>
                </label>
              </div>

              {!loginMicrosoft && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Contraseña inicial
                  </label>
                  <input
                    name="password"
                    type="password"
                    required={!autoPassword}
                    disabled={autoPassword}
                    minLength={8}
                    placeholder={autoPassword ? "Se generará automáticamente" : "Mínimo 8 caracteres"}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249] disabled:bg-slate-50 disabled:text-slate-400"
                  />

                  <label className="mt-2.5 flex items-start gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      name="autoPassword"
                      checked={autoPassword}
                      onChange={(e) => setAutoPassword(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#FD5249]"
                    />
                    <span>
                      Generar una contraseña segura automáticamente y enviarla por
                      email a esta dirección. El usuario no podrá cambiarla; solo
                      tú podrás actualizarla más adelante desde su edición.
                    </span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Rol
                  </label>
                  <select
                    name="role"
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setDepartamentoIds([]);
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Centro
                  </label>
                  <select
                    name="schoolId"
                    value={schoolId}
                    onChange={(e) => {
                      setSchoolId(e.target.value);
                      setDepartamentoIds([]);
                    }}
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  >
                    {schools.length === 0 && <option value="">No hay centros creados todavía</option>}
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(role === "PROFESOR" || role === "COORDINADOR") && schoolId && (
                <div className="rounded-lg border border-slate-200 p-3.5">
                  <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <Building2 className="h-4 w-4 text-[#FD5249]" />
                    {role === "COORDINADOR" ? "Departamentos que coordina" : "Departamentos a los que pertenece"}
                  </label>

                  {departamentos.length === 0 ? (
                    <p className="text-xs text-slate-400">Este centro todavía no tiene departamentos creados.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {departamentos.map((d) => (
                        <label
                          key={d.id}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                            departamentoIds.includes(d.id) ? "border-[#FD5249] bg-red-50 text-[#FD5249]" : "border-slate-200 text-slate-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={departamentoIds.includes(d.id)}
                            onChange={() => toggleDepartamento(d.id)}
                            className="accent-[#FD5249]"
                          />
                          {d.nombre}
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      value={nuevoDepartamento}
                      onChange={(e) => setNuevoDepartamento(e.target.value)}
                      placeholder="Nuevo departamento..."
                      className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#FD5249]"
                    />
                    <button
                      type="button"
                      onClick={handleCrearDepartamento}
                      disabled={creandoDepartamento || !nuevoDepartamento.trim()}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      + Crear
                    </button>
                  </div>

                  {role === "PROFESOR" && departamentoIds.length > 0 && (
                    <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Users className="h-3.5 w-3.5" /> Coordinador{coordinadoresCalculados.length !== 1 ? "es" : ""} asignado{coordinadoresCalculados.length !== 1 ? "s" : ""} automáticamente
                      </p>
                      {coordinadoresCalculados.length === 0 ? (
                        <p className="text-xs text-slate-400">Ninguno de estos departamentos tiene coordinador todavía.</p>
                      ) : (
                        <p className="text-sm font-semibold text-[#0B1D4D]">
                          {coordinadoresCalculados.map((c) => c.nombre).join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />}
                  {pending ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
