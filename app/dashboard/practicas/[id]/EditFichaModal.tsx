"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Lock } from "lucide-react";
import { actualizarFichaAlumno } from "../actions";
import { CampoDesactivable } from "../CampoDesactivable";
import { CampoTelefonoDesactivable } from "../CampoTelefonoDesactivable";
import { ButtonSpinner } from "../../components/ButtonSpinner";
import { useLocale } from "../../SchoolContext";
import { translate } from "../../i18n";

type Ficha = {
  id: string;
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

type AlumnoDatos = {
  fechaNacimiento: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  direccion: string | null;
};

export function EditFichaModal({
  ficha,
  alumnoCurso,
  alumnoDatos,
}: {
  ficha: Ficha;
  alumnoCurso: string;
  alumnoDatos: AlumnoDatos;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("id", ficha.id);
    setPending(true);
    setError(null);
    try {
      await actualizarFichaAlumno(formData);
      router.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
      >
        <Pencil className="h-3.5 w-3.5" /> {translate(locale, "practicas.editarFicha")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">{translate(locale, "practicas.editarFicha")}</h2>
              <button onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.promocion")}</label>
                <div className="flex gap-2">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 has-[:checked]:border-[#FD5249] has-[:checked]:bg-blue-50 has-[:checked]:text-[#FD5249]">
                    <input type="radio" name="promocion" value="PRIMERA" defaultChecked={ficha.promocion === "PRIMERA"} className="accent-[#FD5249]" />
                    {translate(locale, "practicas.primeraPromocion")}
                  </label>
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 has-[:checked]:border-[#FD5249] has-[:checked]:bg-blue-50 has-[:checked]:text-[#FD5249]">
                    <input type="radio" name="promocion" value="SEGUNDA" defaultChecked={ficha.promocion === "SEGUNDA"} className="accent-[#FD5249]" />
                    {translate(locale, "practicas.segundaPromocion")}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.cicloFormativo")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {alumnoCurso}
                  </div>
                  <input type="hidden" name="cicloFormativo" value={alumnoCurso} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    {translate(locale, "practicas.anyTitulacion")} <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="anyTitulacion"
                    required
                    defaultValue={ficha.anyTitulacion ?? ""}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                  >
                    <option value="" disabled>
                      Selecciona...
                    </option>
                    {ficha.anyTitulacion && !Array.from({ length: 9 }, (_, i) => String(2027 + i)).includes(ficha.anyTitulacion) && (
                      <option value={ficha.anyTitulacion}>{ficha.anyTitulacion}</option>
                    )}
                    {Array.from({ length: 2035 - 2027 + 1 }, (_, i) => 2027 + i).map((anyo) => (
                      <option key={anyo} value={anyo}>
                        {anyo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.tutorImes")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    {ficha.tutorImesNombre ?? "—"}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.dni")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {alumnoDatos.tipoDocumento ? `${alumnoDatos.tipoDocumento} ${alumnoDatos.numeroDocumento ?? ""}`.trim() : "—"}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.fechaNacimiento")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {alumnoDatos.fechaNacimiento ? new Date(alumnoDatos.fechaNacimiento).toLocaleDateString("es-ES") : "—"}
                  </div>
                </div>
                <div>
                  <CampoTelefonoDesactivable
                    label={translate(locale, "practicas.telefono")}
                    name="telefono"
                    defaultValue={ficha.telefono ?? ""}
                    initialmenteDesactivado={!ficha.telefono}
                  />
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.correoAlumno")} name="correoAlumno" type="email" defaultValue={ficha.correoAlumno ?? ""} initialmenteDesactivado={!ficha.correoAlumno} />
                </div>
                <div className="col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{translate(locale, "practicas.direccion")}</label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {alumnoDatos.direccion ?? "—"}
                  </div>
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.cap")} name="cap" defaultValue={ficha.cap ?? ""} initialmenteDesactivado={!ficha.cap} />
                </div>
                <div>
                  <CampoDesactivable label={translate(locale, "practicas.nuss")} name="nuss" defaultValue={ficha.nuss ?? ""} initialmenteDesactivado={!ficha.nuss} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {translate(locale, "common.cancelar")}
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
                >
                  {pending && <ButtonSpinner />}
                  {pending ? translate(locale, "common.guardando") : translate(locale, "common.guardar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
