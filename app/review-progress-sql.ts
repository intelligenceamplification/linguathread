import { sql } from "drizzle-orm";

export type ReviewProgressEvent = {
  learner: string; eventId: string; lessonId: string; objectiveId: string; skill: string;
  kind: "targeted-review" | "flashcard-self-rating"; language: string; evidenceDimension: string;
  correct: boolean; supported: boolean; reviewDelayDays?: number; now: Date;
};

/** One statement accepts an event once and updates only its directional evidence. */
export function reviewProgressStatement(event: ReviewProgressEvent) {
  const { learner, lessonId, objectiveId, skill, kind, language, evidenceDimension, correct, now } = event;
  const supported = kind === "flashcard-self-rating" || event.supported;
  const gain = correct ? (supported ? 7 : 18) : -8;
  const days = kind === "flashcard-self-rating" && [1, 3, 7, 14, 30].includes(Number(event.reviewDelayDays)) ? Number(event.reviewDelayDays) : 1;
  const nextReviewAt = new Date(now.getTime() + days * 86_400_000);
  const evidenceId = `${learner}:${objectiveId}:${evidenceDimension.toLocaleLowerCase()}`;
  const eventKey = `${learner}:review:${event.eventId}`;
  const nextExistingReview = kind === "flashcard-self-rating" || !correct
    ? sql`${nextReviewAt}`
    : sql`${now}::timestamptz + (CASE WHEN objective_mastery.score + ${gain} >= 92 THEN 30 WHEN objective_mastery.score + ${gain} >= 78 THEN 14 WHEN objective_mastery.score + ${gain} >= 58 THEN 7 WHEN objective_mastery.score + ${gain} >= 35 THEN 3 ELSE 1 END) * interval '1 day'`;
  return sql`WITH accepted AS (
    INSERT INTO answer_attempts (id, learner_id, lesson_id, skill, kind, language, correct, created_at)
    VALUES (${eventKey}, ${learner}, ${lessonId}, ${skill}, ${kind}, ${language}, ${correct}, ${now})
    ON CONFLICT (id) DO NOTHING RETURNING id
  )
  INSERT INTO objective_mastery (id, learner_id, objective_id, language, status, score, attempts, independent_successes, supported_successes, last_practiced_at, next_review_at, updated_at)
  SELECT ${evidenceId}, ${learner}, ${objectiveId}, ${evidenceDimension}, ${correct ? "forming" : "introduced"}, ${Math.max(0, gain)}, 1,
    ${correct && !supported ? 1 : 0}, ${correct && supported ? 1 : 0}, ${now}, ${nextReviewAt}, ${now} FROM accepted
  ON CONFLICT (id) DO UPDATE SET
    attempts = objective_mastery.attempts + 1,
    independent_successes = objective_mastery.independent_successes + ${correct && !supported ? 1 : 0},
    supported_successes = objective_mastery.supported_successes + ${correct && supported ? 1 : 0},
    score = LEAST(100, GREATEST(0, objective_mastery.score + ${gain})),
    last_practiced_at = ${now}, next_review_at = ${nextExistingReview}, updated_at = ${now}`;
}
