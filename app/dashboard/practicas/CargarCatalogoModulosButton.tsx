"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import { esUsuarioActualSuperAdmin } from "../gruposActions";

export function CargarCatalogoModulosButton() {
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);

  useEffect(() => {
    esUsuarioActualSuperAdmin().then(setEsSuperAdmin);
  }, []);

  if (!esSuperAdmin) return null;

  return (
    <Link
      href="/dashboard/practicas/modulos-admin"
      title="Gestiona manualmente los módulos y las horas de cada ciclo"
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
    >
      <Settings2 className="h-3.5 w-3.5" />
      Gestionar módulos
    </Link>
  );
}
