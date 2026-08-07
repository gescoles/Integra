"use client";

import { useEffect } from "react";
import { useSavingOverlay } from "../SchoolContext";

// Red de seguridad global: en vez de depender de que cada botón concreto
// tenga el <ButtonSpinner /> bien puesto, escuchamos CUALQUIER envío de
// formulario en todo el panel y encendemos la transición nosotros mismos.
// Así, aunque algún formulario en particular tuviera un fallo, la
// transición sigue apareciendo igualmente en todos lados.
const DURACION_MAXIMA_MS = 1500;

export function GlobalSavingListener() {
  const { empezarGuardado, terminarGuardado } = useSavingOverlay();

  useEffect(() => {
    function handleSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      empezarGuardado();
      // No tenemos forma de saber desde aquí fuera cuándo termina de verdad
      // la acción del servidor, así que la apagamos sola pasado un rato
      // prudencial (si el formulario ya la había apagado antes vía su
      // propio ButtonSpinner, esto no hace nada raro: el contador nunca
      // baja de cero).
      window.setTimeout(() => terminarGuardado(), DURACION_MAXIMA_MS);
    }

    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
