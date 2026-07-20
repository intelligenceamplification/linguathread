import { and, asc, eq, lte, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { answerAttempts, learnerProfiles, lessonProgress, objectiveMastery } from "../../../db/schema";

export const dynamic = "force-dynamic";

function learnerId(request: Request) {
  const id = request.headers.get("x-polyflow-learner-id")?.trim();
  return id && /^[a-zA-Z0-9-]{16,80}$/.test(id) ? id : null;
}

export async function GET(request: Request) {
  const db = getDb();
  const learner = learnerId(request);
  if (!db || !learner) return Response.json({ completedLessonIds: [], reviewDueLessonIds: [], localOnly: true });

  const now = new Date();
  const [completed, due, evidence] = await Promise.all([
    db.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress)
      .where(and(eq(lessonProgress.learnerId, learner), eq(lessonProgress.status, "completed")))
      .orderBy(asc(lessonProgress.completedAt)),
    db.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress)
      .where(and(eq(lessonProgress.learnerId, learner), eq(lessonProgress.status, "completed"), lte(lessonProgress.reviewDueAt, now)))
      .orderBy(asc(lessonProgress.reviewDueAt)),
    db.select().from(objectiveMastery)
      .where(eq(objectiveMastery.learnerId, learner))
      .orderBy(asc(objectiveMastery.lastPracticedAt)),
  ]);
  return Response.json({
    completedLessonIds: completed.map((row) => row.lessonId),
    reviewDueLessonIds: due.map((row) => row.lessonId),
    evidence,
  });
}

export async function POST(request: Request) {
  const db = getDb();
  const learner = learnerId(request);
  if (!db || !learner) return Response.json({ saved: false, localOnly: true });

  const body = await request.json() as {
    type?: "attempt" | "complete"; lessonId?: string; skill?: string; kind?: string;
    language?: string; correct?: boolean; accelerated?: boolean; profile?: unknown;
    objectiveId?: string; supported?: boolean;
  };
  if (!body.type || !body.lessonId || !body.skill) return Response.json({ error: "Invalid progress event" }, { status: 400 });

  const now = new Date();
  const progressId = `${learner}:${body.lessonId}`;
  if (body.type === "attempt") {
    const language = body.language || "Spanish";
    const evidenceId = `${learner}:${body.objectiveId || body.lessonId}:${language.toLocaleLowerCase()}`;
    const gain = body.correct ? (body.supported ? 7 : 18) : -8;
    const initialScore = Math.max(0, gain);
    const nextReviewAt = new Date(now.getTime() + (initialScore >= 35 ? 3 : 1) * 86_400_000);
    await Promise.all([
      db.insert(answerAttempts).values({
        id: crypto.randomUUID(), learnerId: learner, lessonId: body.lessonId, skill: body.skill,
        kind: body.kind || "unknown", language, correct: Boolean(body.correct), createdAt: now,
      }),
      db.insert(lessonProgress).values({
        id: progressId, learnerId: learner, lessonId: body.lessonId, skill: body.skill,
        status: "forming", mastery: body.correct ? 55 : 20, attempts: 1, updatedAt: now,
      }).onConflictDoUpdate({
        target: lessonProgress.id,
        set: {
          attempts: sql`${lessonProgress.attempts} + 1`,
          mastery: sql`GREATEST(${lessonProgress.mastery}, ${body.correct ? 55 : 20})`,
          updatedAt: now,
        },
      }),
      db.insert(objectiveMastery).values({
        id: evidenceId,
        learnerId: learner,
        objectiveId: body.objectiveId || body.lessonId,
        language,
        status: body.correct ? "forming" : "introduced",
        score: initialScore,
        attempts: 1,
        independentSuccesses: body.correct && !body.supported ? 1 : 0,
        supportedSuccesses: body.correct && body.supported ? 1 : 0,
        lastPracticedAt: now,
        nextReviewAt,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: objectiveMastery.id,
        set: {
          attempts: sql`${objectiveMastery.attempts} + 1`,
          independentSuccesses: sql`${objectiveMastery.independentSuccesses} + ${body.correct && !body.supported ? 1 : 0}`,
          supportedSuccesses: sql`${objectiveMastery.supportedSuccesses} + ${body.correct && body.supported ? 1 : 0}`,
          score: sql`LEAST(100, GREATEST(0, ${objectiveMastery.score} + ${gain}))`,
          lastPracticedAt: now,
          nextReviewAt,
          updatedAt: now,
        },
      }),
    ]);
    return Response.json({ saved: true });
  }

  const mastery = body.accelerated ? 90 : 75;
  const reviewDueAt = new Date(now.getTime() + (body.accelerated ? 7 : 2) * 86_400_000);
  await db.insert(lessonProgress).values({
    id: progressId, learnerId: learner, lessonId: body.lessonId, skill: body.skill,
    status: "completed", mastery, attempts: 1, completedAt: now, reviewDueAt, updatedAt: now,
  }).onConflictDoUpdate({
    target: lessonProgress.id,
    set: {
      status: "completed", mastery: sql`GREATEST(${lessonProgress.mastery}, ${mastery})`,
      completedAt: sql`COALESCE(${lessonProgress.completedAt}, ${now})`, reviewDueAt, updatedAt: now,
    },
  });
  if (body.profile) {
    await db.insert(learnerProfiles).values({
      learnerId: learner, profileJson: JSON.stringify(body.profile), updatedAt: now,
    }).onConflictDoUpdate({
      target: learnerProfiles.learnerId,
      set: { profileJson: JSON.stringify(body.profile), updatedAt: now },
    });
  }
  return Response.json({ saved: true, mastery, reviewDueAt });
}
