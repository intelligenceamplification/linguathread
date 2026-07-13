export const dynamic = "force-dynamic";

async function database() {
  const { env } = await import("cloudflare:workers");
  return env.DB;
}

function learnerEmail(request: Request) {
  const authenticated = request.headers.get("oai-authenticated-user-email");
  if (authenticated) return authenticated;
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" ? "local-preview@polyflow" : null;
}

export async function GET(request: Request) {
  const db = await database();
  if (!db) return Response.json({ completedLessonIds: [], reviewDueLessonIds: [] });

  const email = learnerEmail(request);
  if (!email) return Response.json({ error: "Sign in required" }, { status: 401 });
  const now = Date.now();
  const completed = await db.prepare(
    "SELECT lesson_id AS lessonId FROM lesson_progress WHERE learner_email = ? AND status = 'completed' ORDER BY completed_at ASC"
  ).bind(email).all<{ lessonId: string }>();
  const due = await db.prepare(
    "SELECT lesson_id AS lessonId FROM lesson_progress WHERE learner_email = ? AND status = 'completed' AND review_due_at <= ? ORDER BY review_due_at ASC"
  ).bind(email, now).all<{ lessonId: string }>();

  return Response.json({
    completedLessonIds: completed.results.map((row) => row.lessonId),
    reviewDueLessonIds: due.results.map((row) => row.lessonId),
  });
}

export async function POST(request: Request) {
  const db = await database();
  if (!db) return Response.json({ saved: false, localOnly: true });

  const email = learnerEmail(request);
  if (!email) return Response.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json() as {
    type?: "attempt" | "complete";
    lessonId?: string;
    skill?: string;
    kind?: string;
    correct?: boolean;
    accelerated?: boolean;
    profile?: unknown;
  };
  if (!body.type || !body.lessonId || !body.skill) return Response.json({ error: "Invalid progress event" }, { status: 400 });

  const now = Date.now();
  const progressId = `${email}:${body.lessonId}`;

  if (body.type === "attempt") {
    const attemptId = crypto.randomUUID();
    await db.batch([
      db.prepare("INSERT INTO answer_attempts (id, learner_email, lesson_id, skill, kind, correct, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(attemptId, email, body.lessonId, body.skill, body.kind || "unknown", body.correct ? 1 : 0, now),
      db.prepare(`INSERT INTO lesson_progress (id, learner_email, lesson_id, skill, status, mastery, attempts, updated_at)
        VALUES (?, ?, ?, ?, 'forming', ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET attempts = attempts + 1, mastery = MAX(mastery, excluded.mastery), updated_at = excluded.updated_at`)
        .bind(progressId, email, body.lessonId, body.skill, body.correct ? 55 : 20, now),
    ]);
    return Response.json({ saved: true });
  }

  const mastery = body.accelerated ? 90 : 75;
  const reviewDueAt = now + (body.accelerated ? 7 : 2) * 24 * 60 * 60 * 1000;
  const writes = [
    db.prepare(`INSERT INTO lesson_progress (id, learner_email, lesson_id, skill, status, mastery, attempts, completed_at, review_due_at, updated_at)
      VALUES (?, ?, ?, ?, 'completed', ?, 1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = 'completed', mastery = MAX(mastery, excluded.mastery), completed_at = COALESCE(completed_at, excluded.completed_at), review_due_at = excluded.review_due_at, updated_at = excluded.updated_at`)
      .bind(progressId, email, body.lessonId, body.skill, mastery, now, reviewDueAt, now),
  ];
  if (body.profile) {
    writes.push(db.prepare(`INSERT INTO learner_profiles (email, profile_json, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at`)
      .bind(email, JSON.stringify(body.profile), now));
  }
  await db.batch(writes);
  return Response.json({ saved: true, mastery, reviewDueAt });
}
