/** Normalize presentation details without erasing contrasts the course teaches. */
export function normalizeAnswer(value: string) {
  return value
    .trim()
    .normalize("NFC")
    .toLocaleLowerCase("es")
    .replace(/[¿?¡!.,;:“”'’]/g, "")
    .replace(/\s+/g, " ");
}
