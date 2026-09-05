"use client";

import { useState } from "react";
import { getCsrfToken } from "next-auth/react";
import { ShieldCheck } from "lucide-react";

// Igual que useSession().update(), pero sin necesitar <SessionProvider />
// envolviendo toda la app (que aquí no existe — el resto de Docentium lee
// la sesión en el servidor con getServerSession, nunca en el cliente):
// actualiza el JWT ya emitido llamando directamente al mismo endpoint
// interno que usa NextAuth, disparando trigger:"update" en el callback jwt.
async function actualizarSesion(data: Record<string, unknown>) {
  const csrfToken = await getCsrfToken();
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csrfToken, data }),
  });
}

export function RememberSessionPrompt({ yaRespondido }: { yaRespondido: boolean }) {
  const [respondido, setRespondido] = useState(yaRespondido);
  const [enviando, setEnviando] = useState(false);

  if (respondido) return null;

  async function responder(recordar: boolean) {
    setEnviando(true);
    // Actualiza el token ya emitido con la decisión — así la sesión sabe
    // desde este mismo instante si tiene que cortarse a las 8h o puede
    // durar hasta 30 días (ver el callback jwt en lib/auth.ts). No hace
    // falta recargar nada: el siguiente request al servidor ya lee el
    // token actualizado.
    await actualizarSesion({ remember: recordar, rememberAnswered: true });
    setRespondido(true);
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
          <ShieldCheck className="h-6 w-6 text-[#FD5249]" />
        </div>
        <h2 className="mb-2 text-lg font-bold text-[#0B1D4D]">¿Mantener la sesión iniciada?</h2>
        <p className="mb-6 text-sm text-slate-500">
          Si dices que sí, este dispositivo recordará tu sesión hasta 30 días. Si dices que no, se
          cerrará sola a las 8 horas.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => responder(false)}
            disabled={enviando}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            No, en este dispositivo no
          </button>
          <button
            onClick={() => responder(true)}
            disabled={enviando}
            className="flex-1 rounded-lg bg-[#FD5249] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E] disabled:opacity-60"
          >
            Sí, mantener sesión
          </button>
        </div>
      </div>
    </div>
  );
}
