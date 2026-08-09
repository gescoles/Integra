import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, GraduationCap, ListChecks, TrendingUp, ExternalLink } from "lucide-react";
import { SiteHeader } from "../../../../components/SiteHeader";
import { SiteFooter } from "../../../../components/SiteFooter";
import { TabsModuls } from "../../TabsModuls";
import { PROGRAMES, getPrograma } from "../../data";
import {
  EscenaArtDisseny,
  EscenaArtsEsceniques,
  EscenaAudiovisuals,
  EscenaProduccioMusical,
  EscenaInformatica,
  EscenaSanitat,
  EscenaComerc,
  EscenaComunitat,
} from "../../../../components/EscenasIMES";

const ESCENES: Record<string, React.ComponentType> = {
  art: EscenaArtDisseny,
  arts: EscenaArtsEsceniques,
  audiovisuals: EscenaAudiovisuals,
  musica: EscenaProduccioMusical,
  informatica: EscenaInformatica,
  sanitat: EscenaSanitat,
  comerc: EscenaComerc,
  comunitat: EscenaComunitat,
};

export function generateStaticParams() {
  return PROGRAMES.map((p) => ({ slug: p.slug }));
}

export default function ProgramaPage({ params }: { params: { slug: string } }) {
  const programa = getPrograma(params.slug);
  if (!programa) notFound();

  const Escena = ESCENES[programa.escena] ?? EscenaComerc;

  return (
    <main className="bg-white">
      <SiteHeader />

      {/* Cabecera con foto grande, igual que la página principal del centro */}
      <section className="relative">
        <div className="relative h-[55vh] min-h-[360px] w-full overflow-hidden">
          {programa.foto ? (
            <img src={programa.foto} alt={programa.nombre} className="h-full w-full object-cover" />
          ) : (
            <Escena />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1D4D]/90 via-[#0B1D4D]/25 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto w-full max-w-7xl px-6 pb-10">
              <Link href="/centros/imes" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white">
                <ArrowLeft className="h-3.5 w-3.5" /> Tornar a iMES Maresme
              </Link>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {programa.tipo}
              </span>
              <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-4xl">
                {programa.nombre}
              </h1>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <p className="max-w-3xl text-[15px] leading-relaxed text-slate-600">{programa.resum}</p>

        <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-3.5">
            <Clock className="h-4 w-4 text-[#FD5249]" />
            <p className="mt-1.5 text-xs font-semibold text-slate-400">Durada</p>
            <p className="text-sm font-bold text-[#0B1D4D]">{programa.duracio}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3.5">
            <GraduationCap className="h-4 w-4 text-[#FD5249]" />
            <p className="mt-1.5 text-xs font-semibold text-slate-400">Requisits d&apos;accés</p>
            <p className="text-sm font-bold text-[#0B1D4D]">{programa.requisits}</p>
          </div>
        </div>
      </section>

      {/* Módulos por curso */}
      <section className="bg-slate-50/60 py-14">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-1 text-xl font-bold text-[#0B1D4D]">Matèries i mòduls</h2>
          <p className="mb-6 text-sm text-slate-500">Distribució orientativa per curs acadèmic.</p>
          <TabsModuls modulsPrimer={programa.modulsPrimer} modulsSegon={programa.modulsSegon} />
        </div>
      </section>

      {/* Salidas y continuidad */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#FD5249]" />
              <h3 className="text-base font-bold text-[#0B1D4D]">Sortides professionals</h3>
            </div>
            <ul className="mt-4 space-y-2">
              {programa.sortides.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FD5249]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-[#FD5249]" />
              <h3 className="text-base font-bold text-[#0B1D4D]">Pots continuar estudiant</h3>
            </div>
            <ul className="mt-4 space-y-2">
              {programa.continuar.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FD5249]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0B1D4D] px-6 py-6">
          <p className="text-sm text-slate-300">Vols més informació o fer la preinscripció d&apos;aquest cicle?</p>
          <a
            href="https://imesmaresme.com/contacte/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]"
          >
            Contacta amb iMES <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Informació orientativa basada en el pla d&apos;estudis oficial d&apos;aquest cicle. Consulta{" "}
          <a href="https://imesmaresme.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#FD5249]">imesmaresme.com</a>{" "}
          per al detall exacte i actualitzat.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
