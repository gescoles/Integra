"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { crearEmpresa, actualizarEmpresa, obtenerEmpresa, obtenerDepartamentosParaEmpresa } from "./actions";
import { obtenerGruposDelCentro } from "../gruposActions";
import { CiudadCombobox } from "./CiudadCombobox";

type EmpresaDetalle = Awaited<ReturnType<typeof obtenerEmpresa>>;

export function EmpresaFormModal({
  empresaId,
  trigger,
  onAbrir,
}: {
  empresaId?: string;
  trigger: React.ReactNode;
  onAbrir?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState<EmpresaDetalle | null>(null);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [departamentos, setDepartamentos] = useState<{ id: string; nombre: string }[]>([]);
  const [ciclosSeleccionados, setCiclosSeleccionados] = useState<string[]>([]);
  const [correosExtra, setCorreosExtra] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esEdicion = Boolean(empresaId);

  async function handleAbrir() {
    onAbrir?.();
    setOpen(true);
    setError(null);
    setCargando(true);
    try {
      const [gruposCentro, empresaDatos, deptos] = await Promise.all([
        obtenerGruposDelCentro(),
        empresaId ? obtenerEmpresa(empresaId) : Promise.resolve(null),
        obtenerDepartamentosParaEmpresa(),
      ]);
      setGrupos(gruposCentro);
      setDatos(empresaDatos);
      setDepartamentos(deptos);
      setCiclosSeleccionados(empresaDatos?.ciclosVinculados ?? []);
      setCorreosExtra(empresaDatos?.contactoEmailsExtra ?? []);
    } finally {
      setCargando(false);
    }
  }

  function handleClose() {
    if (pending) return;
    setOpen(false);
    setDatos(null);
    setError(null);
    setCorreosExtra([]);
  }

  function toggleCiclo(ciclo: string) {
    setCiclosSeleccionados((prev) => (prev.includes(ciclo) ? prev.filter((c) => c !== ciclo) : [...prev, ciclo]));
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    // El multi-selector de ciclos vive en estado propio (checkboxes, no
    // <select multiple>), así que hay que añadirlo a mano al FormData.
    ciclosSeleccionados.forEach((c) => formData.append("ciclosVinculados", c));

    try {
      if (esEdicion && empresaId) {
        await actualizarEmpresa(empresaId, formData);
      } else {
        await crearEmpresa(formData);
      }
      handleClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div onClick={handleAbrir} className="contents">
        {trigger}
      </div>

      {open && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/40 p-6" onClick={handleClose}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-[#0B1D4D]">{esEdicion ? "Editar empresa" : "Nueva empresa"}</h2>
                <p className="text-xs text-slate-400">Actualiza la información de la empresa y mantén al día sus datos de prácticas.</p>
              </div>
              <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {cargando ? (
              <div className="py-16 text-center text-sm text-slate-400">Cargando...</div>
            ) : (
              <form action={handleSubmit} className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Información general</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Razón social" required>
                      <input name="razonSocial" required defaultValue={datos?.razonSocial ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Nombre comercial" required>
                      <input name="nombreComercial" required defaultValue={datos?.nombreComercial ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="CIF">
                      <input name="cif" defaultValue={datos?.cif ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Departamento">
                      <select name="departamentoId" defaultValue={datos?.departamentoId ?? ""} className={inputClass}>
                        <option value="">Sin departamento asignado</option>
                        {departamentos.map((d) => (
                          <option key={d.id} value={d.id}>{d.nombre}</option>
                        ))}
                      </select>
                    </Campo>
                    <Campo label="Sitio web">
                      <input name="sitioWeb" type="url" defaultValue={datos?.sitioWeb ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Correo corporativo">
                      <input name="correoCorporativo" type="email" defaultValue={datos?.correoCorporativo ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Año de fundación">
                      <input name="anyoFundacion" type="number" min={1800} max={2100} defaultValue={datos?.anyoFundacion ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Nº de empleados">
                      <input name="numEmpleados" type="number" min={0} defaultValue={datos?.numEmpleados ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Tamaño de empresa">
                      <select name="tamanoEmpresa" defaultValue={datos?.tamanoEmpresa ?? ""} className={inputClass}>
                        <option value="">Selecciona...</option>
                        <option value="Microempresa">Microempresa</option>
                        <option value="Pequeña empresa">Pequeña empresa</option>
                        <option value="Mediana empresa">Mediana empresa</option>
                        <option value="Gran empresa">Gran empresa</option>
                      </select>
                    </Campo>
                    <Campo label="Tipo de empresa">
                      <select name="tipoEmpresa" defaultValue={datos?.tipoEmpresa ?? ""} className={inputClass}>
                        <option value="">Selecciona...</option>
                        <option value="Privada">Privada</option>
                        <option value="Pública">Pública</option>
                        <option value="Autónomo">Autónomo</option>
                        <option value="ONG">ONG</option>
                      </select>
                    </Campo>
                    <div className="col-span-2">
                      <Campo label="Descripción de la empresa">
                        <textarea name="descripcion" rows={2} defaultValue={datos?.descripcion ?? ""} className={inputClass} />
                      </Campo>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Contacto</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Nombre y apellidos">
                      <input name="contactoNombre" defaultValue={datos?.contactoNombre ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Cargo">
                      <input name="contactoCargo" defaultValue={datos?.contactoCargo ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Correo electrónico">
                      <input name="contactoEmail" type="email" defaultValue={datos?.contactoEmail ?? ""} className={inputClass} />
                      {correosExtra.map((valor, i) => (
                        <div key={i} className="mt-2 flex items-center gap-2">
                          <input
                            name="contactoEmailsExtra"
                            type="email"
                            value={valor}
                            onChange={(e) =>
                              setCorreosExtra((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                            }
                            placeholder="Otro correo electrónico..."
                            className={inputClass}
                          />
                          <button
                            type="button"
                            onClick={() => setCorreosExtra((prev) => prev.filter((_, idx) => idx !== i))}
                            className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCorreosExtra((prev) => [...prev, ""])}
                        className="mt-1.5 text-xs font-semibold text-[#FD5249] hover:underline"
                      >
                        + Añadir correo electrónico
                      </button>
                    </Campo>
                    <Campo label="Teléfono directo">
                      <input name="telefonoDirecto" defaultValue={datos?.telefonoDirecto ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Teléfono">
                      <input name="telefono" defaultValue={datos?.telefono ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Dirección">
                      <input name="direccion" defaultValue={datos?.direccion ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Código postal">
                      <input name="codigoPostal" defaultValue={datos?.codigoPostal ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Ciudad">
                      <CiudadCombobox name="ciudad" defaultValue={datos?.ciudad} />
                    </Campo>
                    <Campo label="Provincia">
                      <input name="provincia" defaultValue={datos?.provincia ?? ""} className={inputClass} />
                    </Campo>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Prácticas</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Vacantes disponibles">
                      <input name="vacantes" type="number" min={0} defaultValue={datos?.vacantes ?? 1} className={inputClass} />
                    </Campo>
                    <Campo label="Modalidad">
                      <select name="modalidad" defaultValue={datos?.modalidad ?? ""} className={inputClass}>
                        <option value="">Selecciona...</option>
                        <option value="Presencial">Presencial</option>
                        <option value="Online">Online</option>
                        <option value="Híbrido">Híbrido</option>
                      </select>
                    </Campo>
                    <Campo label="Horario habitual">
                      <input name="horarioHabitual" placeholder="Ej. 09:00 - 14:00" defaultValue={datos?.horarioHabitual ?? ""} className={inputClass} />
                    </Campo>
                    <Campo label="Estado de la empresa">
                      <select name="estado" defaultValue={datos?.estado ?? "INACTIVO"} className={inputClass}>
                        <option value="INACTIVO">Inactivo</option>
                        <option value="ACTIVO">Activo</option>
                      </select>
                    </Campo>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Ciclos vinculados</h3>
                  <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                    {grupos.length === 0 ? (
                      <p className="text-xs text-slate-400">Tu centro todavía no tiene grupos configurados.</p>
                    ) : (
                      grupos.map((g) => (
                        <button
                          type="button"
                          key={g}
                          onClick={() => toggleCiclo(g)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            ciclosSeleccionados.includes(g) ? "border-[#FD5249] bg-red-50 text-[#FD5249]" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {g}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <Campo label="Requisitos para el alumnado">
                  <textarea name="requisitos" rows={2} maxLength={500} defaultValue={datos?.requisitos ?? ""} className={inputClass} />
                </Campo>

                <Campo label="Observaciones (comentarios internos)">
                  <textarea name="observaciones" rows={2} maxLength={500} defaultValue={datos?.observaciones ?? ""} className={inputClass} />
                </Campo>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" onClick={handleClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={pending} className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60">
                    {pending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear empresa"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]";

function Campo({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
