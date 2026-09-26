/** Slashes show alternatives on screen; they are never spoken as a symbol. */
export function spokenText(text: string) {
  return text.normalize("NFC").replace(/\s*[\/／]\s*/g, ", ").replace(/\s*·\s*/g, ", ").replace(/\s+/g, " ").trim();
}
