// Calcula la edad de verdad a partir de la fecha de nacimiento, comparando
// con el día de hoy — nunca se queda desactualizada, porque no se guarda
// como número fijo en ningún sitio, se recalcula cada vez que se muestra.
export function calcularEdad(fechaNacimiento: Date | null | undefined): number | null {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const noHaLlegadoElCumple =
    hoy.getMonth() < fechaNacimiento.getMonth() ||
    (hoy.getMonth() === fechaNacimiento.getMonth() && hoy.getDate() < fechaNacimiento.getDate());
  if (noHaLlegadoElCumple) edad -= 1;
  return edad;
}
