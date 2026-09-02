import {
  Calendar,
  Briefcase,
  ShieldCheck,
  FolderOpen,
  MessageSquare,
  CalendarClock,
  Bus,
  AlertTriangle,
  FolderKanban,
  Building2,
  Handshake,
  Award,
  Brain,
} from "lucide-react";

export const MODULES = [
  { key: "tutorias", label: "Tutorías", icon: Calendar, color: "bg-amber-50 text-amber-600 border-amber-200" },
  { key: "practicas", label: "Prácticas", icon: Briefcase, color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { key: "guardias", label: "Guardias", icon: ShieldCheck, color: "bg-violet-50 text-violet-600 border-violet-200" },
  { key: "material", label: "Material", icon: FolderOpen, color: "bg-blue-50 text-[#FD5249] border-blue-200" },
  { key: "salidas", label: "Salidas", icon: Bus, color: "bg-orange-50 text-orange-600 border-orange-200" },
  { key: "expedientes", label: "Expedientes (Incidencias)", icon: AlertTriangle, color: "bg-red-50 text-red-600 border-red-200" },
  { key: "onboarding", label: "OnBoarding", icon: FolderKanban, color: "bg-teal-50 text-teal-600 border-teal-200" },
  { key: "espacios", label: "Reserva de Espacios", icon: Building2, color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  { key: "empresas", label: "Empresas", icon: Handshake, color: "bg-cyan-50 text-cyan-600 border-cyan-200" },
  { key: "certificaciones", label: "Certificaciones", icon: Award, color: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200" },
  { key: "psicopedagogia", label: "Psicopedagogia", icon: Brain, color: "bg-pink-50 text-pink-600 border-pink-200" },
  { key: "comunicacion", label: "Comunicación", icon: MessageSquare, color: "bg-sky-50 text-sky-600 border-sky-200" },
  { key: "utilidades", label: "Utilidades (Calendario y Horario)", icon: CalendarClock, color: "bg-rose-50 text-rose-600 border-rose-200" },
] as const;

export const PLAN_LABELS: Record<string, string> = {
  BASICO: "Plan Básico",
  PRO: "Plan Pro",
  PREMIUM: "Plan Premium",
};

export const TYPE_LABELS: Record<string, string> = {
  PRIVADO: "Privado",
  CONCERTADO: "Concertado",
  PUBLICO: "Público",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVO: "Activo",
  REVISION: "Revisión",
  INACTIVO: "Inactivo",
};

export const STATUS_COLORS: Record<string, string> = {
  ACTIVO: "bg-emerald-500",
  REVISION: "bg-amber-500",
  INACTIVO: "bg-slate-400",
};
