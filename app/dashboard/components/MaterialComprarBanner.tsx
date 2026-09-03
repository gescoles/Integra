"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { eliminarNotificacionesPorTipo } from "../notificationsActions";

// Al hacer clic, se borran las notificaciones de "pendiente de comprar"
// de este usuario (para que el aviso no vuelva a salir en la pantalla
// principal) y se navega a Material — la propia solicitud sigue viéndose
// ahí hasta que se compre de verdad, esto solo afecta al aviso.
export function MaterialComprarBanner({ cantidad }: { cantidad: number }) {
  const router = useRouter();
  const [oculto, setOculto] = useState(false);

  if (oculto) return null;

  return (
    <button
      onClick={async () => {
        setOculto(true);
        await eliminarNotificacionesPorTipo("MATERIAL_PENDIENTE_COMPRAR");
        router.push("/dashboard/material");
      }}
      className="mb-5 flex w-full items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left hover:bg-amber-100"
    >
      <div className="flex items-center gap-2.5">
        <Package className="h-4 w-4 shrink-0 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">
          {cantidad === 1
            ? "1 material aprobado, pendiente de comprar."
            : `${cantidad} materiales aprobados, pendientes de comprar.`}
        </span>
      </div>
      <span className="text-xs font-semibold text-amber-700 underline">Revisar en Material</span>
    </button>
  );
}
