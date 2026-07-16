import { and, asc, eq, lte, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { answerAttempts, learnerProfiles, lessonProgress } from "../../../db/schema";

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
  const [completed, due] = await Promise.all([
    db.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress)
      .where(and(eq(lessonProgress.learnerId, learner), eq(lessonProgress.status, "completed")))
      .orderBy(asc(lessonProgress.completedAt)),
    db.select({ lessonId: lessonProgress.lessonId }).from(lessonProgress)
      .where(and(eq(lessonProgress.learnerId, learner), eq(lessonProgress.status, "completed"), lte(lessonProgress.reviewDueAt, now)))
      .orderBy(asc(lessonProgress.reviewDueAt)),
  ]);
  return Response.json({
    completedLessonIds: completed.map((row) => row.lessonId),
    reviewDueLessonIds: due.map((row) => row.lessonId),
  });
}

export async function POST(request: Request) {
  const db = getDb();
  const learner = learnerId(request);
  if (!db || !learner) return Response.json({ saved: false, localOnly: true });

  const body = await request.json() as {
    type?: "attempt" | "complete"; lessonId?: string; skill?: string; kind?: string;
    language?: string; correct?: boolean; accelerated?: boolean; profile?: unknown;
  };
  if (!body.type || !body.lessonId || !body.skill) return Response.json({ error: "Invalid progress event" }, { status: 400 });

  const now = new Date();
  const progressId = `${learner}:${body.lessonId}`;
  if (body.type === "attempt") {
    await Promise.all([
      db.insert(answerAttempts).values({
        id: crypto.randomUUID(), learnerId: learner, lessonId: body.lessonId, skill: body.skill,
        kind: body.kind || "unknown", language: body.language || "Spanish", correct: Boolean(body.correct), createdAt: now,
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
