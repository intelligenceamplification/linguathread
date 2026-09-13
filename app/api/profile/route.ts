import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { learnerProfiles } from "../../../db/schema";
import { isSameOriginMutation, learnerForRequest } from "../../learner-session";
import { markProfileSynchronized, normalizeLanguageProfile } from "../../language-profile";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const db = getDb();
  if (!db) return Response.json({ profile: null, localOnly: true });
  const learnerId = await learnerForRequest(request);
  if (!learnerId) return Response.json({ error: "Unauthenticated installation" }, { status: 401 });
  const [row] = await db.select({ profileJson: learnerProfiles.profileJson, updatedAt: learnerProfiles.updatedAt }).from(learnerProfiles)
    .where(eq(learnerProfiles.learnerId, learnerId)).limit(1);
  if (!row) return Response.json({ profile: null });
  try {
    const profile = normalizeLanguageProfile(JSON.parse(row.profileJson), row.updatedAt.getTime());
    return Response.json({ profile: profile ? markProfileSynchronized(profile) : null, updatedAt: row.updatedAt.getTime() });
  }
  catch { return Response.json({ profile: null }); }
}

export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) return Response.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const db = getDb();
  const body = await request.json().catch(() => null);
  const incoming = normalizeLanguageProfile(body);
  if (!incoming) return Response.json({ error: "Invalid language profile" }, { status: 400 });
  if (!db) return Response.json({ saved: false, localOnly: true, profile: incoming });
  const learnerId = await learnerForRequest(request);
  if (!learnerId) return Response.json({ error: "Unauthenticated installation" }, { status: 401 });
  const [existing] = await db.select({ profileJson: learnerProfiles.profileJson, updatedAt: learnerProfiles.updatedAt })
    .from(learnerProfiles).where(eq(learnerProfiles.learnerId, learnerId)).limit(1);
  if (existing) {
    let current = null;
    try { current = normalizeLanguageProfile(JSON.parse(existing.profileJson), existing.updatedAt.getTime()); }
    catch { current = null; }
    if (current && (current.revision > incoming.revision
      || (current.revision === incoming.revision && current.modifiedAt > incoming.modifiedAt))) {
      return Response.json({ error: "A newer language configuration already exists", profile: markProfileSynchronized(current) }, { status: 409 });
    }
  }
  const updatedAt = new Date();
  const savedProfile = markProfileSynchronized(incoming);
  await db.insert(learnerProfiles).values({ learnerId, profileJson: JSON.stringify(savedProfile), updatedAt })
    .onConflictDoUpdate({ target: learnerProfiles.learnerId, set: { profileJson: JSON.stringify(savedProfile), updatedAt } });
  return Response.json({ saved: true, profile: savedProfile, updatedAt: updatedAt.getTime() });
}
