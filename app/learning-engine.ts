import type { LessonDefinition } from "./curriculum";

export type LearningLanguage = string;
export type ActivityKind = "recall" | "production" | "reconstruction";
export type MasteryState = "introduced" | "forming" | "usable" | "stable" | "maintenance";
export type RetrievalModality = "meaning" | "written" | "audio" | "script" | "structure" | "sound" | "component" | "input";
export type RetrievalType = "recognition" | "reconstruction" | "production" | "transfer" | "reverse";

export type RetrievalEdge = {
  fromLanguage: LearningLanguage;
  toLanguage: LearningLanguage;
  fromModality: RetrievalModality;
  toModality: RetrievalModality;
  retrievalType: RetrievalType;
};

export type SkillEvidence = {
  objectiveId: string;
  language: LearningLanguage;
  attempts: number;
  independentSuccesses: number;
  supportedSuccesses: number;
  independentReviewDays?: string[];
  independentSessionIds?: string[];
  legacyQualified?: boolean;
  score: number;
  lastPracticedAt: string;
  lastFailureAt?: string;
  lastIndependentSuccessAt?: string;
  nextReviewAt: string;
  edge?: RetrievalEdge;
  lastLatencyMs?: number;
  errorType?: "lexical" | "structural" | "script" | "listening" | "production" | "input" | "composition" | "unknown";
};

export type LanguageProgress = {
  status: "active" | "paused";
  priority: number;
  communicationPosition: string | null;
  writingPosition: string | null;
  reviewHistory: string[];
  weakSkills: string[];
  testOutResults: Record<string, { passed: boolean; score: number; completedAt: string }>;
};

export type LearnerModel = {
  version: 3;
  sessionsCompleted: number;
  evidence: Record<string, SkillEvidence>;
  languages: Record<string, LanguageProgress>;
};

export const emptyLearnerModel = (): LearnerModel => ({
  version: 3,
  sessionsCompleted: 0,
  evidence: {},
  languages: {},
});

export function normalizeLearnerModel(value: unknown): LearnerModel {
  if (!value || typeof value !== "object") return emptyLearnerModel();
  const candidate = value as Partial<LearnerModel>;
  return {
    version: 3,
    sessionsCompleted: Number.isFinite(candidate.sessionsCompleted) ? Math.max(0, Number(candidate.sessionsCompleted)) : 0,
    evidence: candidate.evidence && typeof candidate.evidence === "object" ? candidate.evidence : {},
    languages: candidate.languages && typeof candidate.languages === "object" ? candidate.languages : {},
  };
}

export function coordinateLanguageProgress(
  model: LearnerModel,
  selections: Array<{ language: string; status: "active" | "paused"; priority: number }>,
) {
  const languages = { ...model.languages };
  for (const selection of selections) {
    const key = selection.language.toLocaleLowerCase();
    languages[key] = languages[key]
      ? { ...languages[key], status: selection.status, priority: selection.priority }
      : {
        status: selection.status, priority: selection.priority,
        communicationPosition: null, writingPosition: null,
        reviewHistory: [], weakSkills: [], testOutResults: {},
      };
  }
  return { ...model, languages };
}

export function evidenceKey(objectiveId: string, language: LearningLanguage) {
  return `${objectiveId}:${language.toLocaleLowerCase()}`;
}

export function edgeEvidenceKey(objectiveId: string, edge: RetrievalEdge) {
  return [objectiveId, edge.fromLanguage, edge.toLanguage, edge.fromModality, edge.toModality, edge.retrievalType]
    .map((value) => value.toLocaleLowerCase())
    .join(":");
}

export function evidenceForObjective(model: LearnerModel, objectiveId: string) {
  return Object.values(model.evidence).filter((item) => item.objectiveId === objectiveId);
}

export function weakestEvidence(model: LearnerModel, objectiveId: string) {
  const values = evidenceForObjective(model, objectiveId);
  if (!values.length) return undefined;
  return values.reduce((weakest, item) => item.score < weakest.score ? item : weakest);
}

export function languageMastery(model: LearnerModel, objectiveId: string, language: LearningLanguage) {
  const normalized = language.toLocaleLowerCase();
  const values = evidenceForObjective(model, objectiveId).filter((item) =>
    item.language.toLocaleLowerCase() === normalized || item.edge?.toLanguage.toLocaleLowerCase() === normalized);
  if (!values.length) return masteryState(model.evidence[evidenceKey(objectiveId, language)]);
  return masteryState(values.reduce((weakest, item) => item.score < weakest.score ? item : weakest));
}

export function masteryState(evidence?: SkillEvidence): MasteryState | "waiting" {
  if (!evidence) return "waiting";
  const laterRetrieval = (evidence.independentReviewDays?.length || 0) >= 2;
  const separateSessions = evidence.independentSessionIds?.length || 0;
  const legacySessions = evidence.legacyQualified || (evidence.independentSessionIds === undefined && (evidence.independentReviewDays?.length || 0) >= 3) ? 3 : 0;
  if (laterRetrieval && separateSessions >= 4 && evidence.score >= 92) return "maintenance";
  if (laterRetrieval && (separateSessions >= 3 || legacySessions >= 3) && evidence.score >= 78) return "stable";
  if (evidence.score >= 58 && evidence.independentSuccesses >= 2) return "usable";
  if (evidence.attempts >= 2 || evidence.independentSuccesses >= 1) return "forming";
  return "introduced";
}

export function recordEvidence(
  model: LearnerModel,
  objectiveId: string,
  language: LearningLanguage,
  correct: boolean,
  supported: boolean,
  now = new Date(),
  edge?: RetrievalEdge,
  latencyMs?: number,
  errorType?: SkillEvidence["errorType"],
  sessionId?: string,
): LearnerModel {
  const key = edge ? edgeEvidenceKey(objectiveId, edge) : evidenceKey(objectiveId, language);
  const previous = model.evidence[key];
  const independentSuccesses = (previous?.independentSuccesses || 0) + (correct && !supported ? 1 : 0);
  const supportedSuccesses = (previous?.supportedSuccesses || 0) + (correct && supported ? 1 : 0);
  const day = now.toISOString().slice(0, 10);
  const independentReviewDays = correct && !supported
    ? [...new Set([...(previous?.independentReviewDays || []), day])]
    : (previous?.independentReviewDays || []);
  const independentSessionIds = correct && !supported && sessionId
    ? [...new Set([...(previous?.independentSessionIds || []), sessionId])]
    : (previous?.independentSessionIds || []);
  const legacyQualified = previous?.legacyQualified || (previous?.independentSessionIds === undefined && (previous?.independentReviewDays?.length || 0) >= 3);
  const priorScore = previous?.score || 0;
  const score = Math.max(0, Math.min(100, priorScore + (correct ? (supported ? 7 : 18) : -8)));
  const intervalDays = score >= 92 ? 30 : score >= 78 ? 14 : score >= 58 ? 7 : score >= 35 ? 3 : 1;
  const nextReview = new Date(now.getTime() + intervalDays * 86_400_000);

  return {
    ...model,
    evidence: {
      ...model.evidence,
      [key]: {
        objectiveId,
        language,
        attempts: (previous?.attempts || 0) + 1,
        independentSuccesses,
        supportedSuccesses,
        independentReviewDays,
        independentSessionIds,
        legacyQualified,
        score,
        lastPracticedAt: now.toISOString(),
        lastIndependentSuccessAt: correct && !supported ? now.toISOString() : previous?.lastIndependentSuccessAt,
        lastFailureAt: correct ? previous?.lastFailureAt : now.toISOString(),
        nextReviewAt: nextReview.toISOString(),
        edge,
        lastLatencyMs: latencyMs,
        errorType: correct ? undefined : (errorType || "unknown"),
      },
    },
  };
}

/** Retire an exact translation only after independent, delayed production. */
export function isPhraseRetired(lesson: LessonDefinition, model: LearnerModel) {
  const objectiveId = lesson.objectiveId || lesson.id;
  const production = model.evidence[edgeEvidenceKey(objectiveId, {
    fromLanguage: "English", toLanguage: "Spanish", fromModality: "meaning", toModality: "written", retrievalType: "production",
  })];
  if (!production) return false;
  return isEvidenceRetired(production);
}

/** Recover a checked production after a process reload without asking it again. */
export function hasSessionProduction(model: LearnerModel, objectiveId: string, language: string, sessionId: string) {
  const evidence = model.evidence[edgeEvidenceKey(objectiveId, {
    fromLanguage: "English", toLanguage: language, fromModality: "meaning", toModality: "written", retrievalType: "production",
  })];
  return Boolean(sessionId && evidence?.independentSessionIds?.includes(sessionId)
    && !evidence.errorType && (!evidence.lastFailureAt || evidence.lastFailureAt < (evidence.lastIndependentSuccessAt || "")));
}

/** Retirement is specific to the demonstrated retrieval edge. */
export function isEvidenceRetired(evidence: SkillEvidence) {
  const sessions = evidence.independentSessionIds?.length || 0;
  const legacy = evidence.legacyQualified || (evidence.independentSessionIds === undefined && (evidence.independentReviewDays?.length || 0) >= 3);
  return (sessions >= 3 || legacy) && (evidence.independentReviewDays?.length || 0) >= 2
    && !evidence.errorType
    && (!evidence.lastFailureAt || evidence.lastFailureAt < (evidence.lastIndependentSuccessAt || ""));
}

export function completeSession(model: LearnerModel) {
  return { ...model, sessionsCompleted: model.sessionsCompleted + 1 };
}

function objectiveIsUsable(model: LearnerModel, objectiveId: string, language: LearningLanguage) {
  return ["usable", "stable", "maintenance"].includes(languageMastery(model, objectiveId, language));
}

/** A successful target-language production permits studying the next authored step.
 * This does not complete skipped work or certify stable mastery in other skills. */
function objectiveHasIndependentProduction(model: LearnerModel, objectiveId: string, language: LearningLanguage) {
  return evidenceForObjective(model, objectiveId).some(item =>
    item.language.toLocaleLowerCase() === language.toLocaleLowerCase()
    && item.edge?.toLanguage.toLocaleLowerCase() === language.toLocaleLowerCase()
    && item.edge?.toModality === "written" && item.edge?.retrievalType === "production"
    && item.independentSuccesses > 0
    && !item.errorType
    && (!item.lastFailureAt || item.lastFailureAt < (item.lastIndependentSuccessAt || "")));
}

export function isUnlocked(
  lesson: LessonDefinition,
  model: LearnerModel,
  completedLessonIds: string[],
  curriculum: LessonDefinition[],
  language: LearningLanguage = "Spanish",
) {
  return (lesson.prerequisites || []).every((id) =>
    completedLessonIds.includes(id) ||
    completedLessonIds.includes(curriculum.find((item) => item.objectiveId === id)?.id || "") ||
    objectiveIsUsable(model, id, language) || objectiveHasIndependentProduction(model, id, language));
}

export function selectNextLesson(
  curriculum: LessonDefinition[],
  model: LearnerModel,
  completedLessonIds: string[],
  now = new Date(),
  language: LearningLanguage = "Spanish",
  skippedLessonIds: string[] = [],
) {
  const unlockedNew = curriculum.find((lesson) =>
    !completedLessonIds.includes(lesson.id) && !skippedLessonIds.includes(lesson.id) && isUnlocked(lesson, model, completedLessonIds, curriculum, language));
  const due = curriculum.flatMap((lesson) => {
    if (!completedLessonIds.includes(lesson.id)) return [];
    return evidenceForObjective(model, lesson.objectiveId || lesson.id)
      .filter((item) => item.language.toLocaleLowerCase() === language.toLocaleLowerCase()
        && Boolean(item.edge) && (item.edge?.toModality === "written" || item.edge?.toModality === "meaning")
        && (item.independentSuccesses > 0 || Boolean(item.errorType))
        && !isEvidenceRetired(item) && new Date(item.nextReviewAt) <= now)
      .map((evidence) => ({ lesson, evidence }));
  }).sort((a, b) => a.evidence.nextReviewAt.localeCompare(b.evidence.nextReviewAt)
    || a.evidence.lastPracticedAt.localeCompare(b.evidence.lastPracticedAt))[0];
  // One brief edge check per four completed sessions; never restart the lesson cycle.
  if (due && (!unlockedNew || (model.sessionsCompleted > 0 && model.sessionsCompleted % 4 === 0))) {
    return { lesson: due.lesson, mode: "review" as const, reviewEdge: due.evidence.edge };
  }
  if (unlockedNew) return { lesson: unlockedNew, mode: "new" as const };

  const deferred = curriculum.find((lesson) => skippedLessonIds.includes(lesson.id) && !completedLessonIds.includes(lesson.id) && isUnlocked(lesson, model, completedLessonIds, curriculum, language));
  if (deferred) return { lesson: deferred, mode: "strengthen" as const };

  return { lesson: undefined, mode: "complete" as const };
}

export function migrateCompletedLessons(completedLessonIds: string[], curriculum: LessonDefinition[]) {
  return completedLessonIds.reduce((model, lessonId) => {
    const lesson = curriculum.find((item) => item.id === lessonId);
    if (!lesson) return model;
    // Legacy completion did not distinguish skipped work from independent answers.
    return completeSession(model);
  }, emptyLearnerModel());
}
