export const supportedLanguageNames = [
  "English", "Spanish", "Vietnamese", "French", "Portuguese", "German",
  "Italian", "Mandarin Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Russian",
] as const;

export type LanguageName = typeof supportedLanguageNames[number];
export type Confidence = "developing" | "comfortable" | "strong";
export type LanguageStatus = "active" | "paused";
export type StartingChoice = "foundations" | "check";

export type LanguageSelection = {
  language: LanguageName;
  status: LanguageStatus;
  priority: number;
  communicationStart: StartingChoice;
  writingStart: StartingChoice;
  addedAt: number;
};

export type LanguageProfile = {
  schemaVersion: 2;
  revision: number;
  modifiedAt: number;
  syncPending?: boolean;
  native: LanguageName;
  second: LanguageName | null;
  secondConfidence: Confidence | null;
  additional: LanguageName[];
  selections: LanguageSelection[];
};

const supported = new Set<string>(supportedLanguageNames);
const confidence = new Set<Confidence>(["developing", "comfortable", "strong"]);

function language(value: unknown): LanguageName | null {
  return typeof value === "string" && supported.has(value) ? value as LanguageName : null;
}

function integer(value: unknown, fallback = 0) {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}

export function normalizeLanguageProfile(value: unknown, migrationTime = Date.now()): LanguageProfile | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<LanguageProfile> & { native?: unknown; second?: unknown; additional?: unknown; secondConfidence?: unknown };
  const native = language(source.native);
  if (!native) return null;
  const second = language(source.second);
  const legacyAdditional = Array.isArray(source.additional) ? source.additional.map(language).filter((item): item is LanguageName => Boolean(item)) : [];
  const ordered = [...new Set([...(second ? [second] : []), ...legacyAdditional])].filter(item => item !== native);
  const incoming = Array.isArray(source.selections) ? source.selections : [];
  const byLanguage = new Map<LanguageName, LanguageSelection>();
  for (const [index, item] of incoming.entries()) {
    if (!item || typeof item !== "object") continue;
    const name = language(item.language);
    if (!name || name === native || byLanguage.has(name)) continue;
    byLanguage.set(name, {
      language: name,
      status: item.status === "paused" ? "paused" : "active",
      priority: integer(item.priority, index),
      communicationStart: item.communicationStart === "check" ? "check" : "foundations",
      writingStart: item.writingStart === "check" ? "check" : "foundations",
      addedAt: integer(item.addedAt, migrationTime),
    });
  }
  for (const [index, name] of ordered.entries()) if (!byLanguage.has(name)) byLanguage.set(name, {
    language: name, status: "active", priority: index,
    communicationStart: "foundations", writingStart: "foundations", addedAt: migrationTime,
  });
  const selections = [...byLanguage.values()].sort((a, b) => a.priority - b.priority || a.addedAt - b.addedAt)
    .map((item, priority) => ({ ...item, priority }));
  const active = selections.filter(item => item.status === "active").map(item => item.language);
  const activeSecond = second && active.includes(second) ? second : active[0] || null;
  const revision = source.schemaVersion === 2 ? integer(source.revision) : 0;
  const modifiedAt = source.schemaVersion === 2 ? integer(source.modifiedAt, migrationTime) : migrationTime;
  const secondConfidence = activeSecond && confidence.has(source.secondConfidence as Confidence)
    ? source.secondConfidence as Confidence : activeSecond ? "developing" : null;
  return {
    schemaVersion: 2, revision, modifiedAt, syncPending: source.syncPending === true,
    native, second: activeSecond, secondConfidence,
    additional: active.filter(item => item !== activeSecond), selections,
  };
}

export function activeSelections(profile: LanguageProfile) {
  return profile.selections.filter(item => item.status === "active").sort((a, b) => a.priority - b.priority);
}

export function updateSelections(profile: LanguageProfile, selections: LanguageSelection[], now = Date.now()): LanguageProfile {
  return normalizeLanguageProfile({
    ...profile,
    schemaVersion: 2,
    revision: profile.revision + 1,
    modifiedAt: now,
    syncPending: true,
    selections,
    second: selections.find(item => item.status === "active")?.language || null,
    additional: selections.filter(item => item.status === "active").slice(1).map(item => item.language),
  }, now)!;
}

export function chooseAuthoritativeProfile(local: LanguageProfile | null, remote: LanguageProfile | null) {
  if (!local) return remote;
  if (!remote) return local;
  if (local.syncPending && local.revision >= remote.revision) return local;
  if (local.revision !== remote.revision) return local.revision > remote.revision ? local : remote;
  return local.modifiedAt >= remote.modifiedAt ? local : remote;
}

export function markProfileSynchronized(profile: LanguageProfile) {
  return { ...profile, syncPending: false };
}

export function newLanguageProfile(now = Date.now()): LanguageProfile {
  return normalizeLanguageProfile({
    schemaVersion: 2, revision: 0, modifiedAt: now,
    native: "English", second: "Vietnamese", secondConfidence: "developing", additional: ["Spanish"],
  }, now)!;
}
