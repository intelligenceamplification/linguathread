import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { learnerSessions, learners } from "../db/schema";

export const learnerSessionCookie = "linguathread_session";
export const learnerSessionMaxAge = 60 * 60 * 24 * 180;

export function hashOwnershipToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function parseCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const item of header.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return null;
}

export function sessionCookie(token: string) {
  return `${learnerSessionCookie}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${learnerSessionMaxAge}`;
}

export function legacyLearnerId(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

export function isSameOriginMutation(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function learnerForRequest(request: Request) {
  const db = getDb();
  if (!db) return null;
  const token = parseCookie(request.headers.get("cookie"), learnerSessionCookie);
  if (!token || token.length < 32) return null;
  const now = new Date();
  const [session] = await db.select({ learnerId: learnerSessions.learnerId }).from(learnerSessions)
    .where(and(
      eq(learnerSessions.tokenHash, hashOwnershipToken(token)),
      isNull(learnerSessions.revokedAt),
      gt(learnerSessions.expiresAt, now),
    )).limit(1);
  if (!session) return null;
  await db.update(learnerSessions).set({ lastSeenAt: now }).where(eq(learnerSessions.tokenHash, hashOwnershipToken(token)));
  return session.learnerId;
}

export async function createAnonymousLearnerSession() {
  const db = getDb();
  if (!db) return null;
  const now = new Date();
  const token = randomBytes(32).toString("base64url");
  const learnerId = randomUUID();
  await db.insert(learners).values({ id: learnerId, createdAt: now });
  await db.insert(learnerSessions).values({
    tokenHash: hashOwnershipToken(token),
    learnerId,
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + learnerSessionMaxAge * 1000),
  });
  return { learnerId, token };
}
