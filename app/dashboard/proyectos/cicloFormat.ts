// Formato de un curso/grupo del centro para mostrarlo como "ciclo" en el
// módulo de Proyectos: "DAM1" -> "DAM - 1r", "CFGM Sistemas
// Microinformáticos y Redes 2" -> "CFGM Sistemas Microinformáticos y
// Redes - 2n". Solo cambia cómo se ve — el valor real que se guarda y se
// usa para buscar alumnos sigue siendo el curso/grupo exacto (igual que
// Alumno.curso), así que 1r y 2n nunca se mezclan en un mismo proyecto.
// No es "use server" a propósito: la usan tanto acciones de servidor
// como componentes de cliente para pintar la misma etiqueta.
const ORDINALES: Record<string, string> = { "1": "1r", "2": "2n", "3": "3r", "4": "4t" };

export function formatearCiclo(grupo: string): string {
  const match = grupo.match(/^(.*?)\s*(\d+)$/);
  if (!match) return grupo; // no termina en número (p. ej. "1r Batxillerat A") — se deja tal cual
  const [, familia, numero] = match;
  return `${familia.trim()} - ${ORDINALES[numero] ?? `${numero}º`}`;
}
