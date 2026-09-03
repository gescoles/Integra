"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { CTAConLoader } from "./CTAConLoader";

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
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [centrosMovilAbierto, setCentrosMovilAbierto] = useState(false);

  return (
    <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
      <Link href="/" onClick={() => setMenuMovilAbierto(false)}>
        <Logo />
      </Link>

      {/* Navegación de escritorio */}
      <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 lg:flex">
        <a href="/#funciones" className="hover:text-[#0B1D4D]">Funciones</a>
        <a href="/#como-funciona" className="hover:text-[#0B1D4D]">Cómo funciona</a>
        <Link href="/noticias" className="hover:text-[#0B1D4D]">Noticias</Link>
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
                  Formación Profesional
                </p>
                {CENTROS_FP.map((c) => (
                  <ItemCentro key={`fp-${c.slug}`} c={c} />
                ))}
                <div className="my-1 border-t border-slate-100" />
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Bachillerato
                </p>
                {CENTROS_BATXILLERAT.map((c) => (
                  <ItemCentro key={`batx-${c.slug}`} c={c} />
                ))}
              </div>
            </div>
          )}
        </div>
        <Link href="/solicitar" className="hover:text-[#0B1D4D]">Contacto</Link>
      </nav>

      {/* Botones de la derecha: solo en escritorio */}
      <div className="hidden items-center gap-3 lg:flex">
        <Link
          href="/login"
          className="rounded-lg border border-[#FD5249] px-4 py-2 text-sm font-semibold text-[#FD5249] hover:bg-blue-50"
        >
          Iniciar sesión
        </Link>
        <CTAConLoader href="/solicitar?tipo=registro" className="rounded-lg bg-[#FD5249] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#D7463E]">
          Registrar mi centro
        </CTAConLoader>
      </div>

      {/* Botón hamburguesa: solo en móvil/tablet */}
      <button
        onClick={() => setMenuMovilAbierto(true)}
        aria-label="Abrir menú"
        className="rounded-lg p-2 text-[#0B1D4D] hover:bg-slate-100 lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Menú deslizante de móvil, con todo lo que en escritorio va en el nav + los 2 botones */}
      {menuMovilAbierto && (
        <>
          <div
            onClick={() => setMenuMovilAbierto(false)}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col overflow-y-auto bg-white p-5 shadow-xl lg:hidden">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setMenuMovilAbierto(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              <a href="/#funciones" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-50">
                Funciones
              </a>
              <a href="/#como-funciona" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-50">
                Cómo funciona
              </a>
              <Link href="/noticias" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-50">
                Noticias
              </Link>
              <button
                onClick={() => setCentrosMovilAbierto((v) => !v)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-50"
              >
                Centros
                <ChevronDown className={`h-4 w-4 transition-transform ${centrosMovilAbierto ? "rotate-180" : ""}`} />
              </button>
              {centrosMovilAbierto && (
                <div className="ml-2 mt-1 rounded-xl border border-slate-100 bg-slate-50 p-2">
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Formación Profesional
                  </p>
                  {CENTROS_FP.map((c) => (
                    <div key={`fp-m-${c.slug}`} onClick={() => setMenuMovilAbierto(false)}>
                      <ItemCentro c={c} />
                    </div>
                  ))}
                  <div className="my-1 border-t border-slate-200" />
                  <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Bachillerato
                  </p>
                  {CENTROS_BATXILLERAT.map((c) => (
                    <div key={`batx-m-${c.slug}`} onClick={() => setMenuMovilAbierto(false)}>
                      <ItemCentro c={c} />
                    </div>
                  ))}
                </div>
              )}

              <Link href="/solicitar" onClick={() => setMenuMovilAbierto(false)} className="rounded-lg px-3 py-2.5 hover:bg-slate-50">
                Contacto
              </Link>
            </nav>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6">
              <Link
                href="/login"
                onClick={() => setMenuMovilAbierto(false)}
                className="rounded-lg border border-[#FD5249] px-4 py-2.5 text-center text-sm font-semibold text-[#FD5249] hover:bg-blue-50"
              >
                Iniciar sesión
              </Link>
              <CTAConLoader
                href="/solicitar?tipo=registro"
                className="rounded-lg bg-[#FD5249] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-[#D7463E]"
              >
                Registrar mi centro
              </CTAConLoader>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
