import type { LessonDefinition } from "./curriculum";
import { activeSelections, type LanguageProfile } from "./language-profile";
import type { LearnerModel, RetrievalEdge } from "./learning-engine";

export type PracticeCapsule = {
  anchor: string;
  languages: string[];
  lesson: { id: string; title: string; topic: string; level: string; skill: string; stage: string };
  expressions: Array<{ language: string; text: string }>;
  structures: Array<{ language: string; pattern: string; explanation: string }>;
  vocabulary: Array<{ word: string; meanings: Record<string, string> }>;
  recent: Array<{ title: string; expressions: Array<{ language: string; text: string }> }>;
  pathways: Array<{ objective: string; language: string; reason: "weak" | "review"; edge?: RetrievalEdge; error?: string }>;
};

function expressions(lesson: LessonDefinition, languages: string[]) {
  const texts: Record<string, string> = { English: lesson.sentence.anchor, Spanish: lesson.sentence.target, Vietnamese: lesson.sentence.bridge, ...lesson.sentence.translations };
  return languages.filter(language => texts[language]).map(language => ({ language, text: texts[language] }));
}

export function practiceCapsule(lesson: LessonDefinition, profile: LanguageProfile, model: LearnerModel, course: LessonDefinition[], stage: string, now = Date.now()): PracticeCapsule {
  const languages = activeSelections(profile).map(item => item.language).filter(language => language !== profile.native);
  const stack: string[] = [profile.native, ...languages];
  const grammar: Record<string, { pattern: string; explanation: string }> = { English: lesson.grammar.anchor, Spanish: lesson.grammar.target, Vietnamese: lesson.grammar.bridge, ...lesson.grammar.additional };
  const evidence = Object.values(model.evidence).filter(item => item.attempts > 0 && stack.includes(item.language) && (!item.edge || (stack.includes(item.edge.fromLanguage) && stack.includes(item.edge.toLanguage))));
  const recentIds = [...new Set(evidence.sort((a, b) => b.lastPracticedAt.localeCompare(a.lastPracticedAt)).map(item => item.objectiveId))];
  return {
    anchor: profile.native, languages,
    lesson: { id: lesson.id, title: lesson.title, topic: lesson.unitTitle, level: lesson.level, skill: lesson.skill, stage },
    expressions: expressions(lesson, stack),
    structures: stack.filter(language => grammar[language]).map(language => ({ language, pattern: grammar[language].pattern, explanation: grammar[language].explanation.slice(0, 260) })),
    vocabulary: lesson.vocabulary.slice(0, 6).map(item => {
      const meanings: Record<string, string> = { English: item.english, Vietnamese: item.vietnamese, ...item.translations };
      return { word: item.word, meanings: Object.fromEntries(stack.filter(language => meanings[language]).map(language => [language, meanings[language]])) };
    }),
    recent: recentIds.filter(id => id !== (lesson.objectiveId || lesson.id)).map(id => course.find(item => (item.objectiveId || item.id) === id)).filter((item): item is LessonDefinition => Boolean(item)).slice(0, 2).map(item => ({ title: item.title, expressions: expressions(item, stack) })),
    pathways: evidence.filter(item => (item.objectiveId === (lesson.objectiveId || lesson.id) || recentIds.slice(0, 3).includes(item.objectiveId)) && (item.score < 58 || Date.parse(item.nextReviewAt) <= now)).sort((a, b) => a.score - b.score).slice(0, 3).map(item => ({ objective: item.objectiveId, language: item.language, reason: item.score < 58 ? "weak" : "review", edge: item.edge, error: item.errorType })),
  };
}

export function livePracticePrompt(capsule: PracticeCapsule) {
  const expression = (items: PracticeCapsule["expressions"]) => items.map(item => `${item.language}: ${item.text}`).join("\n");
  const recent = capsule.recent.map(item => `${item.title}\n${expression(item.expressions)}`).join("\n\n");
  const pathways = capsule.pathways.map(item => `${item.reason === "weak" ? "Reinforce" : "Review"}: ${item.objective} · ${item.edge ? `${item.edge.fromLanguage} → ${item.edge.toLanguage} (${item.edge.fromModality} → ${item.edge.toModality}, ${item.edge.retrievalType})` : item.language}${item.error ? ` · ${item.error}` : ""}`).join("\n");
  return [
    "You are continuing a LinguaThread language-practice session.",
    `Anchor language: ${capsule.anchor}\nActive languages: ${capsule.languages.join(" + ")}`,
    `Current lesson: ${capsule.lesson.title}\nTopic: ${capsule.lesson.topic} · ${capsule.lesson.level}\nFocus: ${capsule.lesson.skill}\nCurrent activity: ${capsule.lesson.stage}`,
    `Current expressions:\n${expression(capsule.expressions)}`,
    `Current structures:\n${capsule.structures.map(item => `${item.language}: ${item.pattern} — ${item.explanation}`).join("\n")}`,
    `Current vocabulary:\n${capsule.vocabulary.map(item => `${item.word}: ${Object.entries(item.meanings).map(([language, meaning]) => `${language}: ${meaning}`).join("; ")}`).join("\n")}`,
    ...(recent ? [`Relevant recent material:\n${recent}`] : []),
    ...(pathways ? [`Relevant retrieval pathways:\n${pathways}`] : []),
    "Practice instructions:\nContinue from this material through natural spoken conversation. Prioritize listening and speaking. Treat the anchor and every active language as one learning thread; practice retrieval in both directions between each pair where appropriate to my level and the available material. Recycle familiar vocabulary and structures heavily, with natural contextual variations and pattern transfer. Let me attempt retrieval before supplying answers. Correct mistakes naturally and concisely. When I request an X-ray, break the phrase down slowly and explain its structure. Prefer idiomatic native usage and useful register distinctions over forced literal translation. Introduce unfamiliar vocabulary sparingly. Adapt difficulty to my demonstrated performance. Do not claim to update LinguaThread progress. Begin directly with one short practice question rather than explaining these instructions back to me.",
  ].join("\n\n").normalize("NFC");
}
