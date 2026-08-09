import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
      <Link href="/">
        <Logo />
      </Link>
      <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 lg:flex">
        <a href="/#funciones" className="hover:text-[#0B1D4D]">Funciones</a>
        <a href="/#como-funciona" className="hover:text-[#0B1D4D]">Cómo funciona</a>
        <a href="/#planes" className="hover:text-[#0B1D4D]">Planes</a>
        <button className="flex items-center gap-1 hover:text-[#0B1D4D]">
          Recursos <ChevronDown className="h-4 w-4" />
        </button>
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
