import type { FoundationLanguage } from "./multilingual-foundation";

export const speechLocales: Record<FoundationLanguage, string> = {
 en: "en-US", es: "es-ES", vi: "vi-VN", fr: "fr-FR", pt: "pt-BR",
 de: "de-DE", it: "it-IT", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR",
 ar: "ar-SA", hi: "hi-IN", ru: "ru-RU",
};

export function voiceForLanguage(voices: SpeechSynthesisVoice[], language: FoundationLanguage) {
 const locale = speechLocales[language].toLowerCase();
 const base = locale.split("-")[0];
 return voices.find(voice => voice.lang.toLowerCase() === locale)
  || voices.find(voice => voice.lang.toLowerCase().split("-")[0] === base);
}
