import Link from "next/link";
import { Logo, HexLogo } from "./components/Logo";
import { Reveal } from "./components/Reveal";
import { HistoriasDemo } from "./components/HistoriasDemo";
import { ModulosInteractivo } from "./components/ModulosInteractivo";
import { CTAConLoader } from "./components/CTAConLoader";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import {
  Bell,
  ChevronDown,
  ShieldCheck,
  Users,
  FolderOpen,
  BarChart3,
  Calendar,
  Briefcase,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Star,
  School,
  Landmark,
  AlertTriangle,
  FolderKanban,
  Building2,
  Bus,
  Sparkles,
  PenLine,
  Brain,
  Award,
  Handshake,
  Fingerprint,
} from "lucide-react";

function DashboardMock() {
  const navItems = [
    { label: "Inicio", active: true },
    { label: "Tutorías" },
    { label: "Prácticas" },
    { label: "Guardias" },
    { label: "Material" },
    { label: "Salidas" },
    { label: "Expedientes" },
    { label: "OnBoarding" },
    { label: "Reserva de espacios" },
    { label: "Comunicación" },
    { label: "Psicopedagogía" },
    { label: "Certificaciones" },
    { label: "Empresas colaboradoras" },
  ];

  const stats = [
    { label: "Tutorías hoy", value: "12", cta: "Ver calendario" },
    { label: "Reservas activas", value: "9", cta: "Ver espacios" },
    { label: "Expedientes al día", value: "3", cta: "Ver expedientes" },
    { label: "Material compartido", value: "136", cta: "Ver material" },
  ];

  const activities = [
    { title: "Tutoría 2ºA - Mat.", time: "Hoy, 10:00 · Aula 201", color: "bg-blue-500" },
    { title: "Práctica en empresa", time: "Mañana, 09:00", color: "bg-amber-500" },
    { title: "Reunión de coordinación", time: "Viernes, 12:00", color: "bg-emerald-500" },
  ];

  return (
    <div className="animate-float overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
      <div className="flex">
        {/* Sidebar */}
        <div className="flex w-48 flex-col justify-between bg-[#0B1D4D] px-4 py-5">
          <div>
            <div className="mb-3 flex items-center gap-2 px-1">
              <HexLogo size={22} />
              <span className="text-sm font-bold text-white">Docentium</span>
            </div>
            <nav className="space-y-0.5">
              {navItems.map((item) => (
                <div
                  key={item.label}
                  className={`truncate rounded-md px-2.5 py-1.5 text-[10.5px] leading-tight ${
                    item.active
                      ? "bg-[#FD5249] font-semibold text-white"
                      : "text-slate-300"
                  }`}
                >
                  {item.label}
                </div>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 border-t border-white/10 pt-4">
            <div className="h-8 w-8 rounded-full bg-slate-400" />
            <div className="leading-tight">
              <div className="text-[12px] font-semibold text-white">María López</div>
              <div className="text-[11px] text-slate-400">Coordinadora</div>
            </div>
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#0B1D4D]">Inicio</h3>
              <p className="text-xs text-slate-500">Resumen general de tu centro</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1">
                Curso 2024/2025 <ChevronDown className="h-3 w-3" />
              </span>
              <Bell className="h-4 w-4" />
            </div>
          </div>

          <div className="mb-5 grid grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">{s.label}</div>
                <div className="text-xl font-bold text-[#0B1D4D]">{s.value}</div>
                <div className="mt-1 text-[10px] font-medium text-[#FD5249]">{s.cta}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 rounded-xl border border-slate-100 p-4">
              <div className="text-[13px] font-semibold text-[#0B1D4D]">Actividad reciente</div>
              <div className="mb-2 text-[11px] text-slate-500">
                Resumen de la actividad en los últimos 7 días
              </div>
              <svg viewBox="0 0 300 90" className="h-20 w-full">
                <polyline
                  fill="none"
                  stroke="#FD5249"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points="0,60 40,45 80,70 120,30 160,50 200,20 240,35 280,10"
                />
              </svg>
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <div className="mb-3 text-[13px] font-semibold text-[#0B1D4D]">
                Próximas actividades
              </div>
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.title} className="flex items-start gap-2">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.color}`} />
                    <div>
                      <div className="text-[11px] font-medium text-slate-700">{a.title}</div>
                      <div className="text-[10px] text-slate-400">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[10px] font-semibold text-[#FD5249]">
                Ver agenda completa →
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-blue-50 p-3">
            <div className="text-[12px] font-semibold text-[#0B1D4D]">¡Todo al día! 🎉</div>
            <div className="text-[11px] text-slate-500">
              No tienes tareas pendientes. Tu centro va sobre ruedas.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-10 lg:grid-cols-2">
      <Reveal>
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#FD5249]">
          <Sparkles className="h-3.5 w-3.5" /> Todo lo que necesitas, en un solo lugar
        </span>
        <h1 className="mt-5 text-5xl font-extrabold leading-tight text-[#0B1D4D]">
          Toda la gestión <br /> de tu centro, <br />
          <span className="text-[#FD5249]">conectada</span>
        </h1>
        <p className="mt-5 max-w-md text-[15px] text-slate-500">
          Tutorías, prácticas, guardias, expedientes con firma digital,
          reserva de espacios y mucho más &mdash;todo en una sola plataforma
          pensada para el día a día real de un centro educativo.
        </p>
        <div className="mt-7 flex items-center gap-3">
          <CTAConLoader href="/solicitar?tipo=demo" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            Solicitar demo
          </CTAConLoader>
          <CTAConLoader href="/solicitar?tipo=registro" className="flex items-center gap-2 rounded-lg bg-[#FD5249] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#D7463E] hover:shadow-md">
            <ShieldCheck className="h-4 w-4" /> Registrar mi centro
          </CTAConLoader>
        </div>
        <div className="mt-5 flex items-center gap-5 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-[#FD5249]" /> Sin tarjeta de crédito
          </span>
        </div>
      </Reveal>
      <Reveal delay={150}>
        <DashboardMock />
      </Reveal>
    </section>
  );
}

function FeatureStrip() {
  const items = [
    {
      icon: Users,
      title: "Organiza sin complicaciones",
      text: "Centraliza tutorías, prácticas y guardias en un calendario inteligente y fácil de usar.",
    },
    {
      icon: FolderOpen,
      title: "Todo tu material, siempre accesible",
      text: "Almacena, comparte y encuentra recursos didácticos en segundos, desde cualquier dispositivo.",
    },
    {
      icon: ShieldCheck,
      title: "Seguro y confiable",
      text: "Protegemos los datos de tu centro con los más altos estándares de seguridad.",
    },
    {
      icon: BarChart3,
      title: "Decisiones basadas en datos",
      text: "Informes y estadísticas claras para entender y mejorar la gestión de tu centro.",
    },
  ];

  return (
    <section className="border-y border-slate-100 bg-slate-50/60 py-10">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.title} className="flex gap-3">
            <it.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#FD5249]" />
            <div>
              <div className="text-sm font-semibold text-[#0B1D4D]">{it.title}</div>
              <p className="mt-1 text-[13px] text-slate-500">{it.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ManageCards() {
  const cards = [
    {
      icon: Calendar,
      title: "Tutorías",
      text: "Agendas, seguimientos y resúmenes de cada tutoría, con niveles de riesgo por alumno.",
    },
    {
      icon: Briefcase,
      title: "Prácticas",
      text: "Convenios, prórrogas y tutorías de seguimiento en empresa, todo en un mismo expediente.",
    },
    {
      icon: ShieldCheck,
      title: "Guardias",
      text: "Planifica guardias y sustituciones con calendario y notificaciones automáticas.",
    },
    {
      icon: FolderOpen,
      title: "Material",
      text: "Solicita y controla el material didáctico por asignatura, con exportación a Excel.",
    },
    {
      icon: Bus,
      title: "Salidas",
      text: "Organiza salidas escolares con aprobaciones, transporte y comunicación a familias.",
    },
    {
      icon: AlertTriangle,
      title: "Expedientes",
      text: "Incidencias, seguimiento disciplinario y partes con firma digital de dirección y tutores.",
      destacado: true,
    },
    {
      icon: FolderKanban,
      title: "OnBoarding",
      text: "Carpetas y documentos para nuevas incorporaciones, con aviso automático por email.",
    },
    {
      icon: Building2,
      title: "Reserva de espacios",
      text: "Plano interactivo del centro: aulas y salas reservables por horas, en tiempo real.",
      destacado: true,
    },
    {
      icon: MessageSquare,
      title: "Comunicación",
      text: "Avisos, noticias y un muro de historias entre todos los centros de tu red.",
    },
    {
      icon: Brain,
      title: "Psicopedagogía",
      text: "Planes Individualizados (PI) del alumnado con NEE: datos, medidas y soportes, firmados digitalmente y en PDF.",
      destacado: true,
    },
    {
      icon: Award,
      title: "Certificaciones",
      text: "Asigna cursos de formación al profesorado y haz seguimiento de sus certificaciones y renovaciones.",
      destacado: true,
    },
    {
      icon: Handshake,
      title: "Empresas colaboradoras",
      text: "Directorio de empresas, documentación y seguimiento de convenios de prácticas, todo en un mismo sitio.",
      destacado: true,
    },
  ];

  return (
    <section id="funciones" className="mx-auto max-w-7xl px-6 py-16">
      <Reveal className="text-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#FD5249]">
          <Sparkles className="h-3.5 w-3.5" /> Todo tu centro, en un solo sitio
        </span>
        <h2 className="mt-3 text-2xl font-bold text-[#0B1D4D] sm:text-3xl">
          Todo lo que puedes gestionar
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Doce módulos pensados junto a centros reales, para que cada equipo
          encuentre exactamente lo que necesita.
        </p>
      </Reveal>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 60}>
            <div
              className={`group relative h-full overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                c.destacado ? "border-[#FD5249]/30 bg-red-50/40" : "border-slate-200 bg-white"
              }`}
            >
              {c.destacado && (
                <span className="absolute right-0 top-0 rounded-bl-lg bg-[#FD5249] px-2 py-1 text-[10px] font-semibold text-white">
                  Novedad
                </span>
              )}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 transition-colors group-hover:bg-[#FD5249]">
                <c.icon className="h-5 w-5 text-[#FD5249] transition-colors group-hover:text-white" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-[#0B1D4D]">{c.title}</h3>
              <p className="mt-2 text-[13px] text-slate-500">{c.text}</p>
              <ArrowRight className="mt-4 h-4 w-4 rounded-full border border-[#FD5249] p-0.5 text-[#FD5249] transition-transform group-hover:translate-x-1" />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ShowcaseDestacado() {
  return (
    <section className="overflow-hidden bg-[#0B1D4D] py-20">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5 text-[#FD5249]" /> Recién estrenado
          </span>
          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            Tres funciones que no vas a encontrar en cualquier plataforma
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {/* Expedientes con firma digital */}
          <Reveal delay={0}>
            <div className="flex h-full flex-col rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FD5249]">
                <PenLine className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">
                Expedientes con firma digital
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Genera el parte disciplinario, fírmalo con el dedo o el ratón
                &mdash;dirección, tutor y coordinador&mdash; y envíalo por
                email con el PDF adjunto, sin salir de la plataforma.
              </p>
              <div className="mt-5 flex flex-1 flex-col rounded-xl bg-white p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0B1D4D]">Expedient núm. 000042</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-600">Enviado</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px]">
                    <span className="font-medium text-slate-600">Alumne/a</span>
                    <span className="font-semibold text-[#0B1D4D]">Jordi Casas · 3r ESO B</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px]">
                    <span className="font-medium text-slate-600">Resolució</span>
                    <span className="font-semibold text-[#FD5249]">Expulsió de 3 dies</span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {["Dirección", "Tutor/a", "Coordinador"].map((f) => (
                    <div key={f} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-center">
                      <svg viewBox="0 0 60 24" className="mx-auto h-5 w-full">
                        <path d="M4 18 Q 12 4, 20 16 T 36 14 T 56 8" fill="none" stroke="#0B1D4D" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      <span className="text-[8px] font-semibold text-slate-400">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-3 text-center text-[10px] text-slate-400">Firmado y enviado el 8 de agosto</div>
              </div>
            </div>
          </Reveal>

          {/* Reserva de espacios */}
          <Reveal delay={120}>
            <div className="flex h-full flex-col rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FD5249]">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">
                Reserva de espacios con plano del centro
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Cada planta de tu centro, con sus aulas reales. Toca un
                espacio, elige la franja horaria libre y listo &mdash;con
                aviso automático por email.
              </p>
              <div className="mt-5 flex flex-1 flex-col rounded-xl bg-white p-4 shadow-lg">
                <svg viewBox="0 0 220 110" className="w-full">
                  <rect x="8" y="8" width="60" height="45" rx="4" fill="#FEE2E2" stroke="#FD5249" strokeWidth="1.5" />
                  <text x="38" y="34" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0B1D4D">E11</text>
                  <rect x="76" y="8" width="60" height="45" rx="4" fill="#DBEAFE" stroke="#60A5FA" strokeWidth="1.5" />
                  <text x="106" y="34" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0B1D4D">E12</text>
                  <rect x="144" y="8" width="68" height="45" rx="4" fill="#D1FAE5" stroke="#34D399" strokeWidth="1.5" />
                  <text x="178" y="34" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0B1D4D">Teatro</text>
                  <rect x="8" y="61" width="204" height="41" rx="4" fill="#F3E8FF" stroke="#C084FC" strokeWidth="1.5" />
                  <text x="110" y="85" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0B1D4D">Sala de tutorías</text>
                </svg>
                <div className="mt-auto flex items-center justify-between pt-3 text-[10px] text-slate-500">
                  <span>09:00 – 10:00 · Disponible</span>
                  <span className="rounded-full bg-[#FD5249] px-2 py-0.5 font-semibold text-white">Reservar</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Firma de PI's (Planes Individualizados) */}
          <Reveal delay={240}>
            <div className="flex h-full flex-col rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FD5249]">
                <Fingerprint className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">
                Planes Individualizados con firma digital
              </h3>
              <p className="mt-2 text-sm text-slate-300">
                Genera el PI del alumno con NEE y fírmalo con el dedo
                &mdash;dirección, coordinación, familia y alumno&mdash;. El
                PDF se genera solo, sin salir de la plataforma.
              </p>
              <div className="mt-5 flex flex-1 flex-col rounded-xl bg-white p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0B1D4D]">Pla Individualitzat</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-600">Firmado</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px]">
                    <span className="font-medium text-slate-600">Alumne/a</span>
                    <span className="font-semibold text-[#0B1D4D]">Laia Puig · 1r Batx.</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px]">
                    <span className="font-medium text-slate-600">Curs acadèmic</span>
                    <span className="font-semibold text-[#FD5249]">2025/2026</span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {["Direcció", "Coord.", "Família", "Alumne/a"].map((f) => (
                    <div key={f} className="rounded-lg border border-slate-100 bg-slate-50 p-1.5 text-center">
                      <svg viewBox="0 0 60 24" className="mx-auto h-4 w-full">
                        <path d="M4 18 Q 12 4, 20 16 T 36 14 T 56 8" fill="none" stroke="#0B1D4D" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                      <span className="text-[7px] font-semibold text-slate-400">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto pt-3 text-center text-[10px] text-slate-400">PDF generado automáticamente</div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Calendar,
      title: "Contrata tu plan",
      text: "Elige el plan que mejor se adapta a las necesidades de tu centro.",
    },
    {
      icon: Users,
      title: "Ponte en contacto con nosotros",
      text: "Nuestro equipo se encargará de todo y preparará tu centro en la plataforma.",
    },
    {
      icon: ShieldCheck,
      title: "En menos de 48h",
      text: "Ya tienes acceso a la plataforma. Empieza a gestionar guardias, tutorías y todo lo demás.",
    },
  ];

  return (
    <section id="como-funciona" className="bg-slate-50/60 py-16">
      <Reveal className="text-center">
        <h2 className="text-2xl font-bold text-[#0B1D4D]">Cómo funciona</h2>
      </Reveal>
      <div className="mx-auto mt-10 flex max-w-4xl flex-col items-start gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
        {steps.map((s, i) => (
          <Reveal key={s.title} delay={i * 100} className="flex flex-1 flex-col items-center text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <s.icon className="h-6 w-6 text-[#FD5249]" />
              <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#FD5249] text-[11px] font-bold text-white">
                {i + 1}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#0B1D4D]">{s.title}</h3>
            <p className="mt-1 max-w-[220px] text-[13px] text-slate-500">{s.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote:
        "Docentium ha transformado nuestra manera de trabajar. Centralizamos todo y ganamos tiempo para lo importante: nuestros alumnos.",
      name: "Colegio Horizonte",
      place: "Barcelona",
      icon: ShieldCheck,
    },
    {
      quote:
        "La comunicación con el equipo y las familias es mucho más ágil. Todo el material siempre disponible y bien organizado.",
      name: "Instituto del Mirador",
      place: "Valencia",
      icon: School,
    },
    {
      quote:
        "Las guardias y sustituciones nunca habían sido tan fáciles de gestionar. Una herramienta imprescindible para nuestro día a día.",
      name: "Centro Joven Esperanza",
      place: "Sevilla",
      icon: Landmark,
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <Reveal className="text-center">
        <h2 className="text-2xl font-bold text-[#0B1D4D]">
          Opinión de nuestros clientes
        </h2>
        <p className="mt-1 text-xs text-slate-400">Testimonios ilustrativos a modo de ejemplo</p>
      </Reveal>
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((t, i) => (
          <Reveal key={t.name} delay={i * 80}>
            <div className="h-full rounded-xl border border-slate-200 p-6 transition-shadow duration-300 hover:shadow-md">
              <div className="text-3xl text-[#FD5249]">&ldquo;</div>
              <p className="text-[13px] text-slate-600">{t.quote}</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
                  <t.icon className="h-4 w-4 text-[#FD5249]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0B1D4D]">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.place}</div>
                </div>
              </div>
              <div className="mt-2 flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function CTABanner() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="rounded-2xl bg-[#0B1D4D] px-8 py-12 text-center">
        <h2 className="text-2xl font-bold text-white">
          Más tiempo para formar, menos para gestionar
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Únete a cientos de centros que ya han transformado su forma de trabajar con Docentium.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <a href="/#funciones" className="rounded-lg border border-white px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
            Conocer funciones
          </a>
          <CTAConLoader href="/solicitar?tipo=registro" className="rounded-lg bg-[#FD5249] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]">
            Registrar mi centro
          </CTAConLoader>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-white">
      <SiteHeader />
      <Hero />
      <FeatureStrip />
      <ManageCards />
      <ModulosInteractivo />
      <ShowcaseDestacado />
      <HistoriasDemo />
      <HowItWorks />
      <Testimonials />
      <CTABanner />
      <SiteFooter />
    </main>
  );
}
