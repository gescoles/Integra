"use client";

import Link from "next/link";

type Ventana = { id: string; nombre: string };

export function ProyectosTabs({
  ventanas,
  ventanaActiva,
  schoolId,
}: {
  ventanas: Ventana[];
  ventanaActiva: string;
  schoolId?: string;
}) {
  if (ventanas.length === 0) {
    return (
      <div className="mb-5 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">
        Todavía no hay ninguna ventana de proyectos creada. Pide a tu SuperAdmin que cree una desde su panel.
      </div>
    );
  }

  function hrefDe(ventanaId: string) {
    const params = new URLSearchParams();
    if (schoolId) params.set("school", schoolId);
    params.set("ventana", ventanaId);
    return `/dashboard/proyectos?${params.toString()}`;
  }

  return (
    <div className="mb-5 inline-flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
      {ventanas.map((v) => (
        <Link
          key={v.id}
          href={hrefDe(v.id)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            v.id === ventanaActiva ? "bg-white text-[#FD5249] shadow-sm" : "text-slate-500"
          }`}
        >
          {v.nombre}
        </Link>
      ))}
    </div>
  );
}
