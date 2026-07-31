export const TUTORIA_STATUS_LABELS: Record<string, string> = {
  NUEVA: "Nueva tutoría",
  SEGUIMIENTO: "En seguimiento",
  COMPLETADA: "Completada",
  PENDIENTE: "Pendiente",
};

export const TUTORIA_STATUS_COLORS: Record<string, string> = {
  NUEVA: "bg-violet-50 text-violet-600",
  SEGUIMIENTO: "bg-blue-50 text-[#2F6FED]",
  COMPLETADA: "bg-emerald-50 text-emerald-600",
  PENDIENTE: "bg-red-50 text-red-500",
};

export const GUARDIA_STATUS_LABELS: Record<string, string> = {
  PROGRAMADA: "Programada",
  CUBIERTA: "Cubierta",
  PENDIENTE: "Pendiente",
};

export const GUARDIA_STATUS_COLORS: Record<string, string> = {
  PROGRAMADA: "bg-blue-50 text-[#2F6FED]",
  CUBIERTA: "bg-emerald-50 text-emerald-600",
  PENDIENTE: "bg-amber-50 text-amber-600",
};

export const MATERIAL_CATEGORIA_LABELS: Record<string, string> = {
  ELECTRONICA: "Electrónica",
  COMPONENTES: "Componentes",
  HERRAMIENTAS: "Herramientas",
  OTROS: "Otros",
};

export const MATERIAL_CATEGORIA_COLORS: Record<string, string> = {
  ELECTRONICA: "bg-blue-50 text-[#2F6FED]",
  COMPONENTES: "bg-violet-50 text-violet-600",
  HERRAMIENTAS: "bg-amber-50 text-amber-600",
  OTROS: "bg-slate-100 text-slate-500",
};

export const MATERIAL_ESTADO_LABELS: Record<string, string> = {
  EN_STOCK: "En stock",
  BAJO_STOCK: "Bajo stock",
  AGOTADO: "Agotado",
};

export const MATERIAL_ESTADO_COLORS: Record<string, string> = {
  EN_STOCK: "text-emerald-600",
  BAJO_STOCK: "text-amber-600",
  AGOTADO: "text-red-500",
};

export const MATERIAL_ESTADO_DOT: Record<string, string> = {
  EN_STOCK: "bg-emerald-500",
  BAJO_STOCK: "bg-amber-500",
  AGOTADO: "bg-red-500",
};

export const ROLE_LABELS_FULL: Record<string, string> = {
  SUPERADMIN: "Super Usuario",
  ADMIN_CENTRO: "Administrador de centro",
  COORDINADOR: "Coordinación / Dirección",
  PROFESOR: "Profesor",
};
