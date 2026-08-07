import Link from "next/link";
import { Logo, HexLogo } from "./components/Logo";
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
  Linkedin,
  Youtube,
  Facebook,
  Instagram,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

function Header() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
      <Logo />
      <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 lg:flex">
        <a href="#funciones" className="hover:text-[#0B1D4D]">Funciones</a>
        <a href="#como-funciona" className="hover:text-[#0B1D4D]">Cómo funciona</a>
        <a href="#planes" className="hover:text-[#0B1D4D]">Planes</a>
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

function DashboardMock() {
  const navItems = [
    { label: "Inicio", active: true },
    { label: "Tutorías" },
    { label: "Prácticas" },
    { label: "Guardias" },
    { label: "Material" },
    { label: "Comunicación" },
    { label: "Informes" },
    { label: "Configuración" },
  ];

  const stats = [
    { label: "Tutorías hoy", value: "12", cta: "Ver calendario" },
    { label: "Prácticas activas", value: "28", cta: "Ver prácticas" },
    { label: "Guardias esta semana", value: "45", cta: "Ver guardias" },
    { label: "Material compartido", value: "136", cta: "Ver material" },
  ];

  const activities = [
    { title: "Tutoría 2ºA - Mat.", time: "Hoy, 10:00 · Aula 201", color: "bg-blue-500" },
    { title: "Práctica en empresa", time: "Mañana, 09:00", color: "bg-amber-500" },
    { title: "Reunión de coordinación", time: "Viernes, 12:00", color: "bg-emerald-500" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl">
      <div className="flex">
        {/* Sidebar */}
        <div className="flex w-48 flex-col justify-between bg-[#0B1D4D] px-4 py-5">
          <div>
            <div className="mb-6 flex items-center gap-2 px-1">
              <HexLogo size={22} />
              <span className="text-sm font-bold text-white">Integra</span>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg px-3 py-2 text-[13px] ${
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
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#FD5249]">
          + Todo lo que necesitas, en un solo lugar
        </span>
        <h1 className="mt-5 text-5xl font-extrabold leading-tight text-[#0B1D4D]">
          Toda la gestión <br /> de tu centro, <br />
          <span className="text-[#FD5249]">conectada</span>
        </h1>
        <p className="mt-5 max-w-md text-[15px] text-slate-500">
          Integra tutorías, prácticas, guardias y material didáctico en una
          plataforma intuitiva que te ahorra tiempo y mejora la organización
          de tu centro educativo.
        </p>
        <div className="mt-7 flex items-center gap-3">
          <button className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Solicitar demo
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-[#FD5249] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#D7463E]">
            <ShieldCheck className="h-4 w-4" /> Registrar mi centro
          </button>
        </div>
        <div className="mt-5 flex items-center gap-5 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-[#FD5249]" /> Prueba gratis 14 días
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-[#FD5249]" /> Sin tarjeta de crédito
          </span>
        </div>
      </div>
      <DashboardMock />
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
      text: "Gestiona reuniones, agendas y seguimientos de tutorías de forma sencilla.",
      soon: false,
    },
    {
      icon: Briefcase,
      title: "Prácticas",
      text: "Organiza prácticas en empresas, convenios y evaluación de alumnos en cada etapa.",
      soon: true,
    },
    {
      icon: FolderOpen,
      title: "Material",
      text: "Almacena y comparte recursos didácticos por asignatura o curso, con total seguridad.",
      soon: false,
    },
    {
      icon: MessageSquare,
      title: "Comunicación",
      text: "Mantén a tu comunidad informada con avisos, noticias y mensajes dentro de la plataforma.",
      soon: false,
    },
    {
      icon: ShieldCheck,
      title: "Guardias",
      text: "Planifica guardias y sustituciones de forma automática con calendarios y notificaciones.",
      soon: false,
    },
  ];

  return (
    <section id="funciones" className="mx-auto max-w-7xl px-6 py-16">
      <h2 className="text-center text-2xl font-bold text-[#0B1D4D]">
        Todo lo que puedes gestionar
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.title}
            className={`relative overflow-hidden rounded-xl border p-5 ${
              c.soon ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white"
            }`}
          >
            {c.soon && (
              <span className="absolute right-0 top-0 rounded-bl-lg bg-slate-400 px-2 py-1 text-[10px] font-semibold text-white">
                Próximamente
              </span>
            )}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <c.icon className="h-5 w-5 text-[#FD5249]" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#0B1D4D]">{c.title}</h3>
            <p className="mt-2 text-[13px] text-slate-500">{c.text}</p>
            <ArrowRight className="mt-4 h-4 w-4 rounded-full border border-[#FD5249] p-0.5 text-[#FD5249]" />
          </div>
        ))}
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
      <h2 className="text-center text-2xl font-bold text-[#0B1D4D]">Cómo funciona</h2>
      <div className="mx-auto mt-10 flex max-w-4xl flex-col items-start gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
        {steps.map((s, i) => (
          <div key={s.title} className="flex flex-1 flex-col items-center text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <s.icon className="h-6 w-6 text-[#FD5249]" />
              <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#FD5249] text-[11px] font-bold text-white">
                {i + 1}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#0B1D4D]">{s.title}</h3>
            <p className="mt-1 max-w-[220px] text-[13px] text-slate-500">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      quote:
        "Integra ha transformado nuestra manera de trabajar. Centralizamos todo y ganamos tiempo para lo importante: nuestros alumnos.",
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
      <h2 className="text-center text-2xl font-bold text-[#0B1D4D]">
        Opinión de nuestros clientes
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((t) => (
          <div key={t.name} className="rounded-xl border border-slate-200 p-6">
            <div className="text-3xl text-[#FD5249]">&ldquo;</div>
            <p className="text-[13px] text-slate-600">{t.quote}</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
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
        ))}
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Básico",
      desc: "Ideal para centros pequeños",
      price: "49",
      users: "Hasta 10 usuarios",
      features: ["Todo lo incluido básico", "Soporte por email", "Actualizaciones incluidas"],
      cta: "Probar gratis",
      highlight: false,
      soon: false,
    },
    {
      name: "Profesional",
      desc: "Para centros en crecimiento",
      price: "99",
      users: "Hasta 40 usuarios",
      features: ["Todo lo incluido avanzado", "Informes y estadísticas", "Soporte prioritario"],
      cta: "Probar gratis",
      highlight: true,
      soon: false,
    },
    {
      name: "Institucional",
      desc: "Para grandes instituciones",
      price: "149",
      users: "Hasta 100 usuarios",
      features: ["Todo lo incluido", "Integraciones personalizadas", "Soporte dedicado"],
      cta: "Próximamente",
      highlight: false,
      soon: true,
    },
  ];

  return (
    <section id="planes" className="bg-slate-50/60 py-16">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="text-2xl font-bold text-[#0B1D4D]">Planes para cada tipo de centro</h2>
        <p className="mt-2 text-sm text-slate-500">
          Elige el plan que mejor se adapta a tus necesidades.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-6 text-left ${
                p.highlight
                  ? "border-[#FD5249] bg-white shadow-lg"
                  : "border-slate-200 bg-white"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-[#FD5249] px-3 py-1 text-[11px] font-semibold text-white">
                  Más popular
                </span>
              )}
              {p.soon && (
                <span className="absolute right-0 top-0 rounded-bl-xl rounded-tr-2xl bg-amber-400 px-3 py-1 text-[11px] font-semibold text-white">
                  Próximamente
                </span>
              )}
              <div className="text-sm font-bold text-[#0B1D4D]">{p.name}</div>
              <div className="text-xs text-slate-500">{p.desc}</div>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-3xl font-extrabold text-[#0B1D4D]">€{p.price}</span>
                <span className="pb-1 text-xs text-slate-500">/mes</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{p.users}</div>
              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px] text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-[#FD5249]" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={p.soon}
                className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${
                  p.soon
                    ? "cursor-not-allowed bg-slate-200 text-slate-400"
                    : p.highlight
                    ? "bg-[#FD5249] text-white hover:bg-[#D7463E]"
                    : "border border-[#FD5249] text-[#FD5249] hover:bg-blue-50"
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center gap-6 text-xs text-slate-500">
          <span>Prueba gratis 14 días</span>
          <span>Sin compromiso</span>
          <span>Cancela cuando quieras</span>
        </div>
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
          Únete a cientos de centros que ya han transformado su forma de trabajar con Integra.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="rounded-lg border border-white px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
            Conocer funciones
          </button>
          <button className="rounded-lg bg-[#FD5249] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D7463E]">
            Registrar mi centro
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
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
    {
      title: "Legal",
      links: ["Términos de servicio", "Política de cookies", "Aviso legal"],
    },
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
          <div className="text-sm font-semibold text-[#0B1D4D]">Contacto</div>
          <ul className="mt-3 space-y-2 text-[13px] text-slate-500">
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> hola@integraedu.com
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" /> +34 910 123 456
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" /> Calle Educación 123, 28001 Madrid, España
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <main className="bg-white">
      <Header />
      <Hero />
      <FeatureStrip />
      <ManageCards />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <CTABanner />
      <Footer />
    </main>
  );
}
