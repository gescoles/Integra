"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Logo } from "./Logo";

type Centro = { nombre: string; slug: string; lugar: string; logo: string };

// De momento iMES ofereix tant FP com Batxillerat, així que apareix a les
// dues categories. Quan hi hagi més centres, cada un aniràs només a la
// categoria que li correspongui.
const CENTROS_FP: Centro[] = [{ nombre: "iMES Maresme", slug: "imes", lugar: "El Masnou, Barcelona", logo: "/imes/logo.png" }];
const CENTROS_BATXILLERAT: Centro[] = [{ nombre: "iMES Maresme", slug: "imes", lugar: "El Masnou, Barcelona", logo: "/imes/logo.png" }];

function ItemCentro({ c }: { c: Centro }) {
  return (
    <Link href={`/centros/${c.slug}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-white">
        <Image src={c.logo} alt={c.nombre} fill className="object-contain p-1" />
      </div>
      <div>
        <div className="text-sm font-semibold text-[#0B1D4D]">{c.nombre}</div>
        <div className="text-xs text-slate-400">{c.lugar}</div>
      </div>
    </Link>
  );
}

export function SiteHeader() {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
      <Link href="/">
        <Logo />
      </Link>
      <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 lg:flex">
        <a href="/#funciones" className="hover:text-[#0B1D4D]">Funciones</a>
        <a href="/#como-funciona" className="hover:text-[#0B1D4D]">Cómo funciona</a>
        <a href="/#planes" className="hover:text-[#0B1D4D]">Planes</a>
        <div className="relative" onMouseEnter={() => setAbierto(true)} onMouseLeave={() => setAbierto(false)}>
          <button
            onClick={() => setAbierto((v) => !v)}
            className="flex items-center gap-1 hover:text-[#0B1D4D]"
          >
            Centros <ChevronDown className={`h-4 w-4 transition-transform ${abierto ? "rotate-180" : ""}`} />
          </button>
          {abierto && (
            <div className="absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 pt-3">
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Formació Professional
                </p>
                {CENTROS_FP.map((c) => (
                  <ItemCentro key={`fp-${c.slug}`} c={c} />
                ))}
                <div className="my-1 border-t border-slate-100" />
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Batxillerat
                </p>
                {CENTROS_BATXILLERAT.map((c) => (
                  <ItemCentro key={`batx-${c.slug}`} c={c} />
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="rounded-lg border border-[#FD5249] px-4 py-2 text-sm font-semibold text-[#FD5249] hover:bg-blue-50"
        >
          Iniciar sesión
        </Link>
        <button className="rounded-lg bg-[#FD5249] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#D7463E]">
          Registrar mi centro
        </button>
      </div>
    </header>
  );
}
