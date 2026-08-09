import Link from "next/link";
import { Linkedin, Youtube, Facebook, Instagram, Mail, Phone } from "lucide-react";
import { Logo } from "./Logo";

export function SiteFooter() {
  const columns = [
    {
      title: "Producto",
      links: ["Funciones", "Planes y precios", "Novedades", "Roadmap"],
    },
    {
      title: "Recursos",
      links: ["Blog", "Guías", "Webinars", "Centro de ayuda"],
    },
    {
      title: "Empresa",
      links: ["Sobre nosotros", "Trabaja con nosotros", "Contacto", "Política de privacidad"],
    },
  ];

  const legalLinks = [
    { label: "Términos de servicio", href: "/terminos" },
    { label: "Política de cookies", href: "/cookies" },
    { label: "Aviso legal", href: "/aviso-legal" },
  ];

  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-2">
          <Logo />
          <div className="mt-5 flex gap-3 text-slate-400">
            <Linkedin className="h-4 w-4" />
            <Youtube className="h-4 w-4" />
            <Facebook className="h-4 w-4" />
            <Instagram className="h-4 w-4" />
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <div className="text-sm font-semibold text-[#0B1D4D]">{col.title}</div>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l} className="text-[13px] text-slate-500 hover:text-[#FD5249]">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <div className="text-sm font-semibold text-[#0B1D4D]">Legal</div>
          <ul className="mt-3 space-y-2">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[13px] text-slate-500 hover:text-[#FD5249]">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-sm font-semibold text-[#0B1D4D]">Contacto</div>
          <ul className="mt-3 space-y-2 text-[13px] text-slate-500">
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> gescoles@gmail.com
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" /> +34 711 203 121
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
