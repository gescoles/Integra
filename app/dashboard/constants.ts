export const TUTORIA_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  COMPLETADA: "Completada",
};

export const TUTORIA_STATUS_COLORS: Record<string, string> = {
  PENDIENTE: "bg-amber-50 text-amber-600",
  COMPLETADA: "bg-emerald-50 text-emerald-600",
};

// Vocabulario real del estado de una guardia: Pendiente / Cubierta /
// Rechazada. PROGRAMADA se mantiene solo como alias de lectura por si
// queda alguna fila antigua (la app ya no la asigna ni la ofrece como
// opción — para eso está GUARDIA_STATUS_OPTIONS, no Object.keys() de aquí).
export const GUARDIA_STATUS_OPTIONS = ["PENDIENTE", "CUBIERTA", "RECHAZADA"] as const;

export const GUARDIA_STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  CUBIERTA: "Cubierta",
  RECHAZADA: "Rechazada",
  PROGRAMADA: "Pendiente",
};

export const GUARDIA_STATUS_COLORS: Record<string, string> = {
  PENDIENTE: "bg-amber-50 text-amber-600",
  CUBIERTA: "bg-emerald-50 text-emerald-600",
  RECHAZADA: "bg-red-50 text-red-600",
  PROGRAMADA: "bg-amber-50 text-amber-600",
};

export const MATERIAL_CATEGORIA_LABELS: Record<string, string> = {
  ELECTRONICA: "Electrónica",
  COMPONENTES: "Componentes",
  HERRAMIENTAS: "Herramientas",
  OTROS: "Otros",
};

export const MATERIAL_CATEGORIA_COLORS: Record<string, string> = {
  ELECTRONICA: "bg-blue-50 text-[#FD5249]",
  COMPONENTES: "bg-violet-50 text-violet-600",
  HERRAMIENTAS: "bg-amber-50 text-amber-600",
  OTROS: "bg-slate-100 text-slate-500",
};

export const MATERIAL_ESTADO_LABELS: Record<string, string> = {
  PENDIENTE_VALIDACION: "Pendiente validación",
  VALIDADO_PENDIENTE_COMPRA: "Validado / pendiente de compra",
  COMPRADO: "Comprado",
};

export const MATERIAL_ESTADO_COLORS: Record<string, string> = {
  PENDIENTE_VALIDACION: "text-amber-600",
  VALIDADO_PENDIENTE_COMPRA: "text-blue-600",
  COMPRADO: "text-emerald-600",
};

export const MATERIAL_ESTADO_DOT: Record<string, string> = {
  PENDIENTE_VALIDACION: "bg-amber-500",
  VALIDADO_PENDIENTE_COMPRA: "bg-blue-500",
  COMPRADO: "bg-emerald-500",
};

export const ROLE_LABELS_FULL: Record<string, string> = {
  SUPERADMIN: "Super Usuario",
  ADMIN_CENTRO: "Administrador de centro",
  COORDINADOR: "Equipo Directivo",
  DIRECCION: "Dirección",
  ADMINISTRACION: "Administración",
  PROFESOR: "Profesor",
};

export const SALIDA_ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

export const SALIDA_ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: "bg-amber-50 text-amber-600",
  APROBADA: "bg-emerald-50 text-emerald-600",
  RECHAZADA: "bg-red-50 text-red-600",
  ANULADA: "bg-slate-200 text-slate-600",
};
