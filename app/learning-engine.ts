import type { LessonDefinition } from "./curriculum";

export type LearningLanguage = "Spanish" | "Vietnamese";
export type ActivityKind = "recall" | "production" | "reconstruction";
export type MasteryState = "introduced" | "forming" | "usable" | "stable" | "maintenance";

export type SkillEvidence = {
  objectiveId: string;
  language: LearningLanguage;
  attempts: number;
  independentSuccesses: number;
  supportedSuccesses: number;
  score: number;
  lastPracticedAt: string;
  nextReviewAt: string;
};

export type LearnerModel = {
  version: 1;
  sessionsCompleted: number;
  evidence: Record<string, SkillEvidence>;
};

export const emptyLearnerModel = (): LearnerModel => ({
  version: 1,
  sessionsCompleted: 0,
  evidence: {},
});

export function evidenceKey(objectiveId: string, language: LearningLanguage) {
  return `${objectiveId}:${language.toLocaleLowerCase()}`;
}

export function masteryState(evidence?: SkillEvidence): MasteryState | "waiting" {
  if (!evidence) return "waiting";
  if (evidence.score >= 92 && evidence.independentSuccesses >= 4) return "maintenance";
  if (evidence.score >= 78 && evidence.independentSuccesses >= 3) return "stable";
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
): LearnerModel {
  const key = evidenceKey(objectiveId, language);
  const previous = model.evidence[key];
  const independentSuccesses = (previous?.independentSuccesses || 0) + (correct && !supported ? 1 : 0);
  const supportedSuccesses = (previous?.supportedSuccesses || 0) + (correct && supported ? 1 : 0);
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
        score,
        lastPracticedAt: now.toISOString(),
        nextReviewAt: nextReview.toISOString(),
      },
    },
  };
}

export function completeSession(model: LearnerModel) {
  return { ...model, sessionsCompleted: model.sessionsCompleted + 1 };
}

function objectiveIsUsable(model: LearnerModel, objectiveId: string) {
  const spanish = masteryState(model.evidence[evidenceKey(objectiveId, "Spanish")]);
  const vietnamese = masteryState(model.evidence[evidenceKey(objectiveId, "Vietnamese")]);
  return ["usable", "stable", "maintenance"].includes(spanish) &&
    ["usable", "stable", "maintenance"].includes(vietnamese);
}

export function isUnlocked(
  lesson: LessonDefinition,
  model: LearnerModel,
  completedLessonIds: string[],
  curriculum: LessonDefinition[],
) {
  return (lesson.prerequisites || []).every((id) =>
    completedLessonIds.includes(id) ||
    completedLessonIds.includes(curriculum.find((item) => item.objectiveId === id)?.id || "") ||
    objectiveIsUsable(model, id));
}

export function selectNextLesson(
  curriculum: LessonDefinition[],
  model: LearnerModel,
  completedLessonIds: string[],
  now = new Date(),
) {
  const unlockedNew = curriculum.find((lesson) =>
    !completedLessonIds.includes(lesson.id) && isUnlocked(lesson, model, completedLessonIds, curriculum));
  const due = curriculum.find((lesson) => {
    const evidence = model.evidence[evidenceKey(lesson.objectiveId || lesson.id, "Spanish")];
    return completedLessonIds.includes(lesson.id) && evidence && new Date(evidence.nextReviewAt) <= now;
  });

  // New material remains the normal flow; every fourth session gives a due skill priority.
  if (due && model.sessionsCompleted > 0 && model.sessionsCompleted % 4 === 0) {
    return { lesson: due, mode: "review" as const };
  }
  if (unlockedNew) return { lesson: unlockedNew, mode: "new" as const };
  if (due) return { lesson: due, mode: "review" as const };

  const weakest = [...curriculum]
    .filter((lesson) => completedLessonIds.includes(lesson.id))
    .sort((a, b) => {
      const aScore = model.evidence[evidenceKey(a.objectiveId || a.id, "Spanish")]?.score || 0;
      const bScore = model.evidence[evidenceKey(b.objectiveId || b.id, "Spanish")]?.score || 0;
      return aScore - bScore;
    })[0];
  return { lesson: weakest || curriculum[0], mode: "strengthen" as const };
}

export function migrateCompletedLessons(completedLessonIds: string[], curriculum: LessonDefinition[]) {
  return completedLessonIds.reduce((model, lessonId) => {
    const lesson = curriculum.find((item) => item.id === lessonId);
    if (!lesson) return model;
    const objectiveId = lesson.objectiveId || lesson.id;
    const once = recordEvidence(model, objectiveId, "Spanish", true, false);
    const twice = recordEvidence(once, objectiveId, "Vietnamese", true, false);
    return completeSession(twice);
  }, emptyLearnerModel());
}
