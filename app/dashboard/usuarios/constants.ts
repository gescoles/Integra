export const ROLE_LABELS: Record<string, string> = {
  PROFESOR: "Profesor",
  COORDINADOR: "Equipo Directivo",
  ADMIN_CENTRO: "Administrador de centro",
  SUPERADMIN: "Super Admin",
};

export const ROLE_COLORS: Record<string, string> = {
  PROFESOR: "bg-blue-50 text-[#2F6FED]",
  COORDINADOR: "bg-violet-50 text-violet-600",
  ADMIN_CENTRO: "bg-amber-50 text-amber-600",
  SUPERADMIN: "bg-slate-100 text-slate-600",
};

// Roles que el SuperAdmin puede asignar al crear un usuario de centro
export const ASSIGNABLE_ROLES = ["PROFESOR", "COORDINADOR"] as const;

export const STATUS_LABELS: Record<string, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
};

export const STATUS_COLORS: Record<string, string> = {
  ACTIVO: "bg-emerald-500",
  INACTIVO: "bg-slate-400",
};

const AVATAR_PALETTE = [
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
];

export function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}
