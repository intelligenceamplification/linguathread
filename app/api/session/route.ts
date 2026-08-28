import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { answerAttempts, legacyLearnerClaims, learnerProfiles, lessonProgress, objectiveMastery } from "../../../db/schema";
import { createAnonymousLearnerSession, hashOwnershipToken, isSameOriginMutation, learnerForRequest, legacyLearnerId, sessionCookie } from "../../learner-session";

export const dynamic = "force-dynamic";

async function claimLegacyProgress(learnerId: string, candidate: unknown) {
  const db = getDb();
  const legacyId = legacyLearnerId(candidate);
  if (!db || !legacyId || legacyId === learnerId) return false;
  const legacyIdHash = hashOwnershipToken(legacyId);
  const claimedAt = new Date();
  return db.transaction(async (tx) => {
    const [claim] = await tx.insert(legacyLearnerClaims).values({ legacyIdHash, learnerId, claimedAt })
      .onConflictDoNothing().returning({ learnerId: legacyLearnerClaims.learnerId });
    if (!claim) return false;
    await tx.update(learnerProfiles).set({ learnerId }).where(eq(learnerProfiles.learnerId, legacyId));
    await tx.update(lessonProgress).set({ learnerId }).where(eq(lessonProgress.learnerId, legacyId));
    await tx.update(answerAttempts).set({ learnerId }).where(eq(answerAttempts.learnerId, legacyId));
    await tx.update(objectiveMastery).set({ learnerId }).where(eq(objectiveMastery.learnerId, legacyId));
    return true;
  });
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return Response.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const db = getDb();
  if (!db) return Response.json({ localOnly: true, authenticated: false });
  const body = await request.json().catch(() => ({})) as { legacyLearnerId?: unknown };
  let learnerId = await learnerForRequest(request);
  let token: string | null = null;
  if (!learnerId) {
    const created = await createAnonymousLearnerSession();
    if (!created) return Response.json({ localOnly: true, authenticated: false });
    learnerId = created.learnerId;
    token = created.token;
  }
  const legacyClaimed = await claimLegacyProgress(learnerId, body.legacyLearnerId);
  const response = Response.json({ localOnly: false, authenticated: false, installationIsolated: true, legacyClaimed });
  if (token) response.headers.set("set-cookie", sessionCookie(token));
  return response;
}
