"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { enviarExpediente } from "./actions";
import { ButtonSpinner } from "../components/ButtonSpinner";
import { useLocale } from "../SchoolContext";
import { translate } from "../i18n";

export function EnviarExpedienteButton({ expedienteId }: { expedienteId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(translate(locale, "expedientes.confirmEnviar"))) return;
    setError(null);
    setPending(true);
    enviarExpediente(expedienteId)
      .then(() => router.refresh())
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo enviar."))
      .finally(() => setPending(false));
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? <ButtonSpinner /> : <Send className="h-3.5 w-3.5" />}
        {translate(locale, "expedientes.enviarAlTutor")}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
