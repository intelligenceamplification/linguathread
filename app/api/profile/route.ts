import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { learnerProfiles } from "../../../db/schema";
import { isSameOriginMutation, learnerForRequest } from "../../learner-session";

export const dynamic = "force-dynamic";

type LanguageProfile = { native: string; second: string | null; secondConfidence: string | null; additional: string[] };

function validProfile(value: unknown): value is LanguageProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<LanguageProfile>;
  return typeof profile.native === "string" && profile.native.length <= 80
    && (profile.second === null || (typeof profile.second === "string" && profile.second.length <= 80))
    && (profile.secondConfidence === null || ["developing", "comfortable", "strong"].includes(profile.secondConfidence || ""))
    && Array.isArray(profile.additional) && profile.additional.length <= 12
    && profile.additional.every((language) => typeof language === "string" && language.length <= 80);
}

export async function GET(request: Request) {
  const db = getDb();
  if (!db) return Response.json({ profile: null, localOnly: true });
  const learnerId = await learnerForRequest(request);
  if (!learnerId) return Response.json({ error: "Unauthenticated installation" }, { status: 401 });
  const [row] = await db.select({ profileJson: learnerProfiles.profileJson }).from(learnerProfiles)
    .where(eq(learnerProfiles.learnerId, learnerId)).limit(1);
  if (!row) return Response.json({ profile: null });
  try { return Response.json({ profile: JSON.parse(row.profileJson) }); }
  catch { return Response.json({ profile: null }); }
}

export async function PUT(request: Request) {
  if (!isSameOriginMutation(request)) return Response.json({ error: "Cross-origin request rejected" }, { status: 403 });
  const db = getDb();
  if (!db) return Response.json({ saved: false, localOnly: true });
  const learnerId = await learnerForRequest(request);
  if (!learnerId) return Response.json({ error: "Unauthenticated installation" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!validProfile(body)) return Response.json({ error: "Invalid language profile" }, { status: 400 });
  const updatedAt = new Date();
  await db.insert(learnerProfiles).values({ learnerId, profileJson: JSON.stringify(body), updatedAt })
    .onConflictDoUpdate({ target: learnerProfiles.learnerId, set: { profileJson: JSON.stringify(body), updatedAt } });
  return Response.json({ saved: true });
}
