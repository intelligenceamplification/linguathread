// Existing authored models for the few fragments whose isolated synthesis is
// unreliable. The control must display the exact context before playing it.
const contexts: Record<string, Record<string, string>> = {
  es: {
    Llevo: "Llevo seis meses estudiando español.",
    corregir: "Aprendí mucho al corregir mis errores.",
    "haberte hablado": "Siento haberte hablado de esa manera.",
  },
  vi: {
    cách: "một cách bình tĩnh hơn",
    sửa: "Tôi học được nhiều khi sửa lỗi của mình.",
  },
};

export function instructionalAudioText(text: string, language: string) {
  return contexts[language]?.[text.normalize("NFC").trim()] || text;
}
