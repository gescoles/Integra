import {
  Calendar,
  Briefcase,
  ShieldCheck,
  Folder,
  FileText,
  Building2,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Los 7 módulos que rodean el monograma "DC" en la marca de Docentium:
 * Calendario, Guardias, Expedientes, Material, Documentos, Centro, Chat.
 * Se usan tanto en el logo estático (Logo.tsx) como en el loader animado
 * (AssemblingLogo.tsx), repartidos a partes iguales alrededor del círculo.
 */
export const DOCENTIUM_MODULES: { Icon: LucideIcon; angle: number }[] = [
  { Icon: Calendar, angle: 0 },
  { Icon: Briefcase, angle: 51.43 },
  { Icon: ShieldCheck, angle: 102.86 },
  { Icon: Folder, angle: 154.29 },
  { Icon: FileText, angle: 205.71 },
  { Icon: Building2, angle: 257.14 },
  { Icon: MessageCircle, angle: 308.57 },
];
