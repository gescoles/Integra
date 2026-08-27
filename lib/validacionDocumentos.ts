// Validación de documentos de identidad españoles — solo de formato (8
// dígitos + una letra cualquiera para DNI, X/Y/Z + 7 dígitos + una letra
// cualquiera para NIE). No se comprueba que la letra sea la de control
// real: cualquier letra vale, con tal de que cumpla la forma. El pasaporte
// no tiene un formato estándar, así que solo se exige que no esté vacío.

export function validarDNI(valor: string): boolean {
  const v = valor.trim().toUpperCase();
  return /^\d{8}[A-Z]$/.test(v);
}

export function validarNIE(valor: string): boolean {
  const v = valor.trim().toUpperCase();
  return /^[XYZ]\d{7}[A-Z]$/.test(v);
}

export function validarDocumento(tipo: "DNI" | "NIE" | "PASAPORTE", valor: string): boolean {
  const v = (valor || "").trim();
  if (!v) return false;
  if (tipo === "DNI") return validarDNI(v);
  if (tipo === "NIE") return validarNIE(v);
  return true; // Pasaporte: cualquier valor no vacío es válido, sin formato fijo.
}

export function mensajeErrorDocumento(tipo: "DNI" | "NIE" | "PASAPORTE"): string {
  if (tipo === "DNI") return "El DNI no es válido (formato: 8 dígitos + letra, p. ej. 12345678Z).";
  if (tipo === "NIE") return "El NIE no es válido (formato: X/Y/Z + 7 dígitos + letra, p. ej. X1234567L).";
  return "El pasaporte es obligatorio.";
}

// Teléfono español: exactamente 9 dígitos cuando el prefijo es +34. Para el
// resto de países se mantiene un rango más amplio (6 a 12 dígitos), ya que
// cada país tiene su propia longitud estándar.
export function validarTelefono(valorCompleto: string): boolean {
  const match = /^(\+\d{1,4}) (\d{6,12})$/.exec((valorCompleto || "").trim());
  if (!match) return false;
  const prefijo = match[1];
  const numero = match[2];
  if (prefijo === "+34") return /^\d{9}$/.test(numero);
  return numero.length >= 6 && numero.length <= 12;
}
