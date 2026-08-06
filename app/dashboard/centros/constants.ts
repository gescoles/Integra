import {
  Calendar,
  Briefcase,
  ShieldCheck,
  FolderOpen,
  MessageSquare,
  CalendarClock,
  Bus,
} from "lucide-react";

export const MODULES = [
  { key: "tutorias", label: "Tutorías", icon: Calendar, color: "bg-amber-50 text-amber-600 border-amber-200" },
  { key: "practicas", label: "Prácticas", icon: Briefcase, color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { key: "guardias", label: "Guardias", icon: ShieldCheck, color: "bg-violet-50 text-violet-600 border-violet-200" },
  { key: "material", label: "Material", icon: FolderOpen, color: "bg-blue-50 text-[#2F6FED] border-blue-200" },
  { key: "salidas", label: "Salidas", icon: Bus, color: "bg-orange-50 text-orange-600 border-orange-200" },
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
