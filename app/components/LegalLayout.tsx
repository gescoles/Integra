import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function LegalLayout({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  actualizado: string;
  children: React.ReactNode;
}) {
  return (
    <main className="bg-white">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-extrabold text-[#0B1D4D]">{titulo}</h1>
        <p className="mt-2 text-sm text-slate-400">Última actualización: {actualizado}</p>
        <div className="legal-content mt-8 space-y-5 text-[15px] leading-relaxed text-slate-600">
          {children}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
