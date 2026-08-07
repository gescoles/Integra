"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, MessageCircleQuestion, Sparkles } from "lucide-react";
import { crearEntrada, actualizarEntrada, eliminarEntrada, eliminarPreguntaSinResponder } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

type Entrada = { id: string; pregunta: string; palabrasClave: string[]; respuesta: string };
type PreguntaSinResponder = { id: string; texto: string; createdAt: string };

export function ChatbotAdminClient({
  entradas,
  preguntasSinResponder,
}: {
  entradas: Entrada[];
  preguntasSinResponder: PreguntaSinResponder[];
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Entrada | null>(null);
  const [prefillPregunta, setPrefillPregunta] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function openNueva(preguntaInicial = "") {
    setEditing(null);
    setPrefillPregunta(preguntaInicial);
    setError(null);
    setOpen(true);
  }

  function openEditar(entrada: Entrada) {
    setEditing(entrada);
    setPrefillPregunta("");
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setEditing(null);
    formRef.current?.reset();
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      if (editing) {
        formData.set("id", editing.id);
        await actualizarEntrada(formData);
      } else {
        await crearEntrada(formData);
      }
      router.refresh();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  function handleEliminar(id: string) {
    if (!confirm(translate(locale, "chatbotAdmin.confirmEliminar"))) return;
    eliminarEntrada(id).then(() => router.refresh());
  }

  function handleDescartarPregunta(id: string) {
    eliminarPreguntaSinResponder(id).then(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      {/* Preguntas que la gente ha hecho y el chatbot no supo responder */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4 text-amber-600" />
          <h2 className="text-sm font-bold text-[#0B1D4D]">{translate(locale, "chatbotAdmin.sinResponder")}</h2>
        </div>
        {preguntasSinResponder.length === 0 ? (
          <p className="text-sm text-slate-500">{translate(locale, "chatbotAdmin.sinPendientes")}</p>
        ) : (
          <div className="space-y-2">
            {preguntasSinResponder.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5">
                <span className="text-sm text-slate-700">{p.texto}</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => openNueva(p.texto)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#FD5249] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#D7463E]"
                  >
                    <Sparkles className="h-3 w-3" /> {translate(locale, "chatbotAdmin.enseñarRespuesta")}
                  </button>
                  <button
                    onClick={() => handleDescartarPregunta(p.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lo que el chatbot ya sabe */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0B1D4D]">
            {translate(locale, "chatbotAdmin.respuestasGuardadas")} ({entradas.length})
          </h2>
          <button
            onClick={() => openNueva()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
          >
            <Plus className="h-4 w-4" /> {translate(locale, "chatbotAdmin.nuevaRespuesta")}
          </button>
        </div>

        <div className="space-y-3">
          {entradas.map((e) => (
            <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-700">{e.pregunta}</h3>
                  <p className="mt-1 text-sm text-slate-500">{e.respuesta}</p>
                  {e.palabrasClave.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {e.palabrasClave.map((k) => (
                        <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEditar(e)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#FD5249]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleEliminar(e.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1D4D]">
                {editing ? translate(locale, "chatbotAdmin.editarRespuesta") : translate(locale, "chatbotAdmin.nuevaRespuesta")}
              </h2>
              <button onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} action={handleSubmit} className="space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "chatbotAdmin.pregunta")}
                </label>
                <input
                  name="pregunta"
                  required
                  defaultValue={editing?.pregunta ?? prefillPregunta}
                  placeholder={translate(locale, "chatbotAdmin.preguntaPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "chatbotAdmin.palabrasClave")}
                </label>
                <input
                  name="palabrasClave"
                  defaultValue={editing?.palabrasClave.join(", ") ?? ""}
                  placeholder={translate(locale, "chatbotAdmin.palabrasClavePlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
                <p className="mt-1 text-xs text-slate-400">{translate(locale, "chatbotAdmin.palabrasClaveAyuda")}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  {translate(locale, "chatbotAdmin.respuesta")}
                </label>
                <textarea
                  name="respuesta"
                  required
                  rows={5}
                  defaultValue={editing?.respuesta ?? ""}
                  placeholder={translate(locale, "chatbotAdmin.respuestaPlaceholder")}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#FD5249]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
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
    </div>
  );
}
