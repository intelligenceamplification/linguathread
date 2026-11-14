import type { LessonDefinition } from "./curriculum";

/** Language-specific policies stay outside the shared Review components. */
export function reviewDirection(language: string): "ltr" | "rtl" {
  return ["arabic", "hebrew", "persian", "urdu"].includes(language.toLocaleLowerCase()) ? "rtl" : "ltr";
}
export function normalizeReviewAnswer(value: string, language: string) {
  const text = value.trim().normalize("NFC").toLocaleLowerCase().replace(/[‘’]/g, "'");
  return (language.toLocaleLowerCase() === "english" ? text.replace(/[¿?¡!.,;:“”]/g, "") : text.replace(/[¿?¡!.,;:“”'’]/g, "")).replace(/\s+/g, " ");
}
export function reviewPhraseTiles(lesson: LessonDefinition, language: string, answer: string): string[] {
  const realization = lesson.anatomy?.realizations.find(row => row.language.toLocaleLowerCase() === language.toLocaleLowerCase() && normalizeReviewAnswer(row.sentence, language) === normalizeReviewAnswer(answer, language));
  const visible = realization?.units.filter(unit => unit.visibility !== "implied" && unit.visibility !== "omitted" && !unit.segments?.length);
  if (visible?.length && normalizeReviewAnswer(visible.map(unit => `${unit.text}${unit.after || " "}`).join(""), language) === normalizeReviewAnswer(answer, language)) return visible.map(unit => unit.text);
  return answer.trim().split(/\s+/u);
}

/** Include the words needed by authored alternatives without collapsing repeated words. */
export function reviewWordBank(lesson: LessonDefinition, language: string, answer: string, alternatives: string[]): string[] {
  const bank = reviewPhraseTiles(lesson, language, answer);
  const counts = (words: string[]) => words.reduce((result, word) => {
    const key = normalizeReviewAnswer(word, language);
    result.set(key, (result.get(key) || 0) + 1);
    return result;
  }, new Map<string, number>());
  for (const alternative of alternatives) {
    const words = reviewPhraseTiles(lesson, language, alternative);
    const available = counts(bank);
    const needed = new Map<string, number>();
    for (const word of words) {
      const key = normalizeReviewAnswer(word, language);
      const count = (needed.get(key) || 0) + 1;
      needed.set(key, count);
      if (count > (available.get(key) || 0)) bank.push(word);
    }
  }
  return bank;
}
