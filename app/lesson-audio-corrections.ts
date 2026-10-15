import type { LessonDefinition } from "./curriculum";

// Two published vocabulary entries contain editorial English labels where a
// Spanish word is required. Use words already present in their target sentence.
// Apply only to the erroneous entries, so a later authored correction wins.
const corrections: Record<string, { label: string; word: string; english: string; vietnamese: string; note: string }> = {
  "a2-u18-1-acknowledging-harm-lesson": {
    label: "repair intention", word: "manera", english: "way", vietnamese: "cách",
    note: "Manera means way. De esa manera describes how you spoke to someone.",
  },
  "a2-u18-2-clarifying-intention-lesson": {
    label: "intention contrast", word: "quería", english: "I wanted / meant", vietnamese: "muốn",
    note: "Quería expresses a past intention. No quería means I did not want or mean to.",
  },
};

export function correctLessonAudioText(lessons: LessonDefinition[]): LessonDefinition[] {
  return lessons.map((lesson) => {
    const correction = corrections[lesson.id];
    if (!correction || !lesson.vocabulary.some((word) => word.word === correction.label)) return lesson;
    if (!lesson.sentence.target.includes(correction.word)) throw new Error(`Audio correction no longer matches ${lesson.id}.`);
    return { ...lesson, vocabulary: lesson.vocabulary.map((item) => item.word === correction.label
      ? { ...item, word: correction.word, english: correction.english, vietnamese: correction.vietnamese, note: correction.note }
      : item) };
  });
}
