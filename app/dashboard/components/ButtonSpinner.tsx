"use client";

import { useEffect } from "react";
import { useSavingOverlay } from "../SchoolContext";

export function ButtonSpinner({ light = true }: { light?: boolean }) {
  const { empezarGuardado, terminarGuardado } = useSavingOverlay();

  // Este componente solo se renderiza mientras un formulario está guardando
  // (patrón "{pending && <ButtonSpinner />}" usado en toda la app), así que
  // su montaje/desmontaje es la señal perfecta para encender y apagar la
  // transición de pantalla completa, sin tener que tocar cada formulario.
  useEffect(() => {
    empezarGuardado();
    return () => terminarGuardado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${
        light ? "border-white/40 border-t-white" : "border-slate-300 border-t-[#2F6FED]"
      }`}
    />
  );
}
