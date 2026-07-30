// Genera un avatar de animalito gracioso y único, igual para profesores,
// coordinadores y alumnos.
export function generateAvatarUrl(name: string): string {
  const seed = `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `https://robohash.org/${encodeURIComponent(seed)}?set=set4&size=200x200`;
}
