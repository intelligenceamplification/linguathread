import type { LessonDefinition } from "./curriculum";
import { edgeEvidenceKey, evidenceForObjective, isEvidenceRetired, isPhraseRetired, recordEvidence, type LearnerModel, type RetrievalEdge, type ReviewItem, type SkillEvidence } from "./learning-engine";

export type Flashcard = {
  id: string; objectiveId: string; lesson: LessonDefinition; language: "Spanish" | "Vietnamese";
  kind: "Expression" | "Vocabulary" | "Pattern"; prompt: string; answer: string;
  stack: { language: "Spanish" | "Vietnamese"; text: string }[];
  explanation?: string; evidence?: SkillEvidence; edge: RetrievalEdge; reason: "Strengthen" | "Due" | "Explore recall";
};
export type FlashcardEvidence = SkillEvidence & { selfRatingStreak?: number };
const cooldown = 15 * 60_000;
const objective = (lesson: LessonDefinition) => lesson.objectiveId || lesson.id;
const failed = (e?: SkillEvidence) => Boolean(e?.lastFailureAt && e.lastFailureAt >= (e.lastIndependentSuccessAt || ""));

/** Cards are authored material already encountered, never a second curriculum. */
export function flashcardCatalog(course: LessonDefinition[], model: LearnerModel, completedIds: string[], activeLanguages: string[]): Flashcard[] {
  const active = new Set(activeLanguages);
  return course.flatMap(lesson => {
    const history = evidenceForObjective(model, objective(lesson));
    if (!completedIds.includes(lesson.id) && !history.length) return [];
    const cards: Flashcard[] = [];
    const add = (kind: Flashcard["kind"], prompt: string, spanish: string, vietnamese: string, explanation?: string) => {
      for (const language of ["Spanish", "Vietnamese"] as const) {
        if (!active.has(language)) continue;
        const answer = language === "Spanish" ? spanish : vietnamese;
        if (!answer) continue;
        const id = `${objective(lesson)}::card:${language}:${encodeURIComponent(answer.normalize("NFC"))}`;
        const edge: RetrievalEdge = { fromLanguage: "English", toLanguage: language, fromModality: "meaning", toModality: "written", retrievalType: "recognition" };
        const evidence = model.evidence[edgeEvidenceKey(id, edge)];
        // The same expression and its pattern share one schedule, with alternating cues.
        const patternTurn = Boolean(evidence && evidence.supportedSuccesses % 2 === 1);
        if (kind === "Pattern" && !patternTurn) continue;
        if (kind === "Expression" && patternTurn) continue;
        cards.push({ id, objectiveId: id, lesson, language, kind, prompt, answer, explanation, edge, evidence,
          stack: ([{ language: "Spanish", text: spanish }, { language: "Vietnamese", text: vietnamese }] as Flashcard["stack"]).filter(row => active.has(row.language)),
          reason: failed(evidence) || history.some(failed) ? "Strengthen" : evidence ? "Due" : "Explore recall" });
      }
    };
    add("Expression", lesson.sentence.anchor, lesson.sentence.target, lesson.sentence.bridge);
    add("Pattern", `${lesson.grammar.focus}\n${lesson.sentence.anchor}`, lesson.sentence.target, lesson.sentence.bridge, lesson.grammar.insight);
    for (const word of lesson.vocabulary) add("Vocabulary", word.english, word.word, word.vietnamese, word.note);
    return cards;
  });
}

export function flashcardQueue(course: LessonDefinition[], model: LearnerModel, completedIds: string[], activeLanguages: string[], now = new Date(), excludeLessonId?: string): Flashcard[] {
  const completionOrder = new Map(completedIds.map((id, index) => [id, index]));
  const recent = (card: Flashcard) => Math.max(0, ...evidenceForObjective(model, objective(card.lesson)).map(e => Date.parse(e.lastPracticedAt)));
  return flashcardCatalog(course, model, completedIds, activeLanguages).filter(card => {
    if (card.lesson.id === excludeLessonId) return false;
    if (card.kind !== "Vocabulary" && isPhraseRetired(card.lesson, model)) return false;
    if (card.evidence) return Date.parse(card.evidence.nextReviewAt) <= now.getTime() && now.getTime() - Date.parse(card.evidence.lastPracticedAt) >= cooldown;
    const history = evidenceForObjective(model, objective(card.lesson));
    const last = Math.max(0, ...history.map(e => Date.parse(e.lastPracticedAt)));
    // Legacy completion admits recall practice, never establishes competence.
    return now.getTime() - last >= cooldown;
  }).sort((a, b) => Number(b.reason === "Strengthen") - Number(a.reason === "Strengthen")
    || Number(Boolean(b.evidence)) - Number(Boolean(a.evidence))
    || (a.evidence?.nextReviewAt || "").localeCompare(b.evidence?.nextReviewAt || "")
    || recent(b) - recent(a) || (completionOrder.get(b.lesson.id) || 0) - (completionOrder.get(a.lesson.id) || 0));
}

/** Self-report after reveal is supported practice, never an independent test. */
export function recordFlashcardRating(model: LearnerModel, card: Flashcard, known: boolean, sessionId: string, latencyMs: number, now = new Date()) {
  const key = edgeEvidenceKey(card.objectiveId, card.edge);
  const previous = model.evidence[key] as FlashcardEvidence | undefined;
  const streak = known ? (previous?.selfRatingStreak || 0) + 1 : 0;
  const days = known ? [1, 3, 7, 14, 30][Math.min(streak - 1, 4)] : 1;
  const next = recordEvidence(model, card.objectiveId, card.language, known, true, now, card.edge, latencyMs, known ? undefined : "lexical", sessionId);
  next.evidence[key] = { ...next.evidence[key], selfRatingStreak: streak, nextReviewAt: new Date(now.getTime() + days * 86_400_000).toISOString() } as FlashcardEvidence;
  return { model: next, reviewDelayDays: days };
}

/** Listening has its own evidence and due date; writing success cannot satisfy it. */
export function listeningReviewQueue(course: LessonDefinition[], model: LearnerModel, completedIds: string[], languages: string[], now = new Date()): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const lesson of course) {
    const history = evidenceForObjective(model, objective(lesson));
    if (!completedIds.includes(lesson.id) && !history.length) continue;
    for (const language of ["Spanish", "Vietnamese"] as const) {
      if (!languages.includes(language)) continue;
      const edge: RetrievalEdge = { fromLanguage: language, toLanguage: "English", fromModality: "audio", toModality: "meaning", retrievalType: "recognition" };
      const existing = model.evidence[edgeEvidenceKey(objective(lesson), edge)];
      if (existing && (isEvidenceRetired(existing) || Date.parse(existing.nextReviewAt) > now.getTime())) continue;
      const last = existing ? Date.parse(existing.lastPracticedAt) : Math.max(0, ...history.filter(e => e.edge?.fromModality !== "audio" || e.language === language).map(e => Date.parse(e.lastPracticedAt)));
      if (now.getTime() - last < cooldown) continue;
      const evidence: SkillEvidence = existing || { objectiveId: objective(lesson), language, attempts: 0, independentSuccesses: 0, supportedSuccesses: 0, score: 0, lastPracticedAt: new Date(last).toISOString(), nextReviewAt: now.toISOString(), edge };
      items.push({ lesson, evidence, reason: failed(evidence) ? "Needs strengthening" : "Due for recall" });
    }
  }
  return items.sort((a, b) => Number(failed(b.evidence)) - Number(failed(a.evidence)) || a.evidence.nextReviewAt.localeCompare(b.evidence.nextReviewAt)).slice(0, 12);
}

export function planFlashcards(queue: Flashcard[], limit: number) {
  const seen = new Set<string>();
  return queue.filter(card => {
    const key = `${card.language}:${card.answer}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, limit);
}
