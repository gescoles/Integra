import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Instagram,
  Facebook,
  Linkedin,
  ExternalLink,
  Sparkles,
  Award,
  ShieldCheck,
  Lightbulb,
  ClipboardCheck,
  Handshake as HandshakeIcon,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { SiteHeader } from "../../components/SiteHeader";
import { SiteFooter } from "../../components/SiteFooter";
import {
  EscenaArtDisseny,
  EscenaArtsEsceniques,
  EscenaAudiovisuals,
  EscenaProduccioMusical,
  EscenaInformatica,
  EscenaSanitat,
  EscenaComerc,
  EscenaComunitat,
} from "../../components/EscenasIMES";
import { PROGRAMES } from "./data";

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

const METODOLOGIA = [
  {
    icon: Lightbulb,
    titulo: "Aprenentatge per projectes",
    texto: "En comptes de classes magistrals, cada mòdul es treballa a través de projectes reals que posen l'alumne al centre.",
  },
  {
    icon: ClipboardCheck,
    titulo: "Avaluació per competències",
    texto: "No es qualifica per exàmens de mòdul: després de cada projecte, l'alumne rep un informe competencial sobre el que ha après.",
  },
  {
    icon: GraduationCap,
    titulo: "Professorat en actiu",
    texto: "Les classes les fan professionals que treballen actualment en el seu sector, portant a l'aula el dia a dia real de la feina.",
  },
  {
    icon: HandshakeIcon,
    titulo: "FP Dual amb empreses",
    texto: "Bona part de la formació es fa dins d'empreses reals, i molts alumnes acaben contractats per la mateixa companyia.",
  },
];

function CardPrograma({ p }: { p: (typeof PROGRAMES)[number] }) {
  const Escena = ESCENES[p.escena] ?? EscenaComerc;
  return (
    <Link
      href={`/centros/imes/estudis/${p.slug}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#FD5249] hover:shadow-lg"
    >
      <div className="h-28 w-full overflow-hidden">
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-110">
          {p.foto ? <img src={p.foto} alt={p.nombre} className="h-full w-full object-cover" /> : <Escena />}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-[#0B1D4D]">{p.nombre}</p>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#FD5249]" />
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{p.resum}</p>
      </div>
    </Link>
  );
}

export default function CentroIMESPage() {
  const batxilleratsArtistics = PROGRAMES.filter((p) => p.tipo === "Batxillerat Artístic");
  const batxilleratsGenerals = PROGRAMES.filter((p) => p.tipo === "Batxillerat");
  const familiesFP = Array.from(new Set(PROGRAMES.filter((p) => p.tipo.startsWith("CFG")).map((p) => p.familia)));

  return (
    <main className="bg-white">
      <SiteHeader />

      {/* Hero con foto real a toda anchura */}
      <section className="relative">
        <div className="relative h-[70vh] min-h-[420px] w-full overflow-hidden">
          <img
            src="/imes/port-mataro.jpg"
            alt="Vista des d'iMES Maresme cap al mar i l'skyline de Barcelona"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1D4D]/90 via-[#0B1D4D]/20 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto w-full max-w-7xl px-6 pb-12">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-[#FD5249]" /> Centro que confía en Integra
              </span>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                iMES Maresme
              </h1>
              <p className="mt-3 max-w-xl text-lg text-slate-200">
                Batxillerat Artístic i Cicles Formatius al Masnou, davant del mar.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href="https://imesmaresme.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FD5249] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#D7463E]"
                >
                  Visitar imesmaresme.com <ExternalLink className="h-4 w-4" />
                </a>
                <Link
                  href="/login"
                  className="rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Soy de iMES, iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Qué significa iMES + metodología, con foto real de alumnes */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#FD5249]">
              Qui són
            </span>
            <h2 className="mt-3 text-2xl font-bold text-[#0B1D4D] sm:text-3xl">
              Què vol dir iMES?
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              Les sigles <strong>MES</strong> corresponen a <strong>Maresme Estudis
              Superiors</strong>. El centre neix el 2023 com un projecte on
              conflueixen el saber fer i l&apos;experiència de dues xarxes
              d&apos;escoles de llarga trajectòria a Catalunya, <strong>Stucom</strong> i{" "}
              <strong>Monlau</strong>, aplicats per primer cop a la comarca del
              Maresme.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
              El centre es defineix per allunyar-se de les classes magistrals
              tradicionals: aplica metodologies actives que posen l&apos;alumne
              al centre del procés d&apos;aprenentatge, molt a prop de
              l&apos;estació de tren i davant del mar, al Masnou.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm">
                <Award className="h-4 w-4 text-[#FD5249]" />
                <span className="text-slate-600">Estudis homologats</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm">
                <ShieldCheck className="h-4 w-4 text-[#FD5249]" />
                <span className="text-slate-600">Qualitat certificada per AENOR</span>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-lg">
            <img src="/imes/alumnes-tutoria.jpg" alt="Alumnes d'iMES Maresme en una sessió de tutoria" className="w-full object-cover" />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {METODOLOGIA.map((m) => (
            <div key={m.titulo} className="rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <m.icon className="h-4 w-4 text-[#FD5249]" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">{m.titulo}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{m.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Momentos del centro: fotos reales */}
      <section className="bg-[#0B1D4D] py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              Un dia a iMES
            </span>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Moments del centre</h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="overflow-hidden rounded-2xl">
              <img src="/imes/produccio-musical.jpg" alt="Actuació musical d'alumnes d'iMES Maresme" className="h-64 w-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>
            <div className="overflow-hidden rounded-2xl">
              <img src="/imes/simulacio-sanitat.jpg" alt="Pràctica de simulació sanitària a iMES Maresme" className="h-64 w-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>
            <div className="overflow-hidden rounded-2xl">
              <img src="/imes/aula-anatomia.jpg" alt="Classe pràctica d'anatomia a iMES Maresme" className="h-64 w-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>
          </div>
        </div>
      </section>

      {/* Oferta formativa */}
      <section className="bg-slate-50/60 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#FD5249]">
              Oferta formativa
            </span>
            <h2 className="mt-3 text-2xl font-bold text-[#0B1D4D] sm:text-3xl">Batxillerats i Cicles Formatius</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">Toca qualsevol estudi per veure el detall complet: matèries, durada i sortides professionals.</p>
          </div>

          <div className="mt-10">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">Batxillerat Artístic</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {batxilleratsArtistics.map((p) => (
                <CardPrograma key={p.slug} p={p} />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {batxilleratsGenerals.map((p) => (
                <CardPrograma key={p.slug} p={p} />
              ))}
            </div>
          </div>

          <div className="mt-12">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-400">Formació Professional</h3>
            {familiesFP.map((familia) => (
              <div key={familia} className="mb-8">
                <p className="mb-3 text-xs font-semibold text-slate-500">{familia}</p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {PROGRAMES.filter((p) => p.familia === familia).map((p) => (
                    <CardPrograma key={p.slug} p={p} />
                  ))}
                </div>
              </div>
            ))}
            <p className="mt-2 text-center text-xs text-slate-400">
              iMES ofereix també FP Internacional i cursos subvencionats i d&apos;especialització (com el curs d&apos;instal·lació de plaques fotovoltaiques).
            </p>
          </div>
        </div>
      </section>

      {/* Ubicación y contacto */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-6">
            <MapPin className="h-5 w-5 text-[#FD5249]" />
            <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">Adreça</h3>
            <p className="mt-1 text-sm text-slate-500">C/ Mossèn Jacint Verdaguer 1<br />08320 El Masnou (Barcelona)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <Clock className="h-5 w-5 text-[#FD5249]" />
            <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">Horari</h3>
            <p className="mt-1 text-sm text-slate-500">De dilluns a divendres<br />de 8h a 20h</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-6">
            <Phone className="h-5 w-5 text-[#FD5249]" />
            <h3 className="mt-3 text-sm font-bold text-[#0B1D4D]">Contacte</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <Phone className="h-3.5 w-3.5" /> 931 594 248
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <Mail className="h-3.5 w-3.5" /> info@imesmaresme.com
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0B1D4D] px-6 py-5">
          <p className="text-sm text-slate-300">Segueix a iMES Maresme a les seves xarxes:</p>
          <div className="flex items-center gap-4">
            <a href="https://www.instagram.com/imes.maresme/" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="https://www.facebook.com/imesmaresme" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="https://www.linkedin.com/company/imesmaresme/" target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white">
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Esta página presenta información pública de iMES Maresme como centro cliente de Integra.
          Para preinscripcions, matrícula i informació oficial, consulta{" "}
          <a href="https://imesmaresme.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#FD5249]">imesmaresme.com</a>.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
