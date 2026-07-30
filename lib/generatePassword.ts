const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I, O (se confunden con 1, 0)
const LOWER = "abcdefghijkmnpqrstuvwxyz"; // sin l, o
const DIGITS = "23456789"; // sin 0, 1
const SYMBOLS = "!@#$%&*";

function pickRandom(chars: string) {
  return chars[Math.floor(Math.random() * chars.length)];
}

export function generatePassword(length = 8): string {
  const all = UPPER + LOWER + DIGITS + SYMBOLS;

  // Garantiza al menos un carácter de cada tipo
  const required = [pickRandom(UPPER), pickRandom(LOWER), pickRandom(DIGITS), pickRandom(SYMBOLS)];

  const rest = Array.from({ length: Math.max(0, length - required.length) }, () =>
    pickRandom(all)
  );

  const combined = [...required, ...rest];

  // Baraja el resultado para que los tipos no queden siempre en el mismo orden
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join("");
}
