import type { LessonDefinition } from "../curriculum";
import { languageInfo, type FoundationLanguage } from "../multilingual-foundation";

/** Only real authored realizations may bridge into literacy. Never substitute English. */
export function courseMaterial(lesson: LessonDefinition, language: FoundationLanguage) {
 const name = languageInfo(language).name;
 const sentence = language === "es" ? lesson.sentence.target : language === "vi" ? lesson.sentence.bridge : language === "en" ? lesson.sentence.anchor : lesson.sentence.translations?.[name];
 const vocabulary = lesson.vocabulary.flatMap(word => {
  const form = language === "es" ? word.word : language === "vi" ? word.vietnamese : language === "en" ? word.english : word.translations?.[name];
  return form ? [{ form, meaning: word.english }] : [];
 });
 return { lessonId: lesson.id, title: lesson.title, level: lesson.level, sentence, meaning: sentence ? lesson.sentence.anchor : undefined, vocabulary };
}

export function relatedVocabulary(forms: string[], vocabulary: { form: string; meaning: string }[]) {
 const normalize = (text: string) => text.normalize("NFC").toLocaleLowerCase();
 return vocabulary.filter(word => forms.some(form => form && normalize(word.form).includes(normalize(form))));
}
