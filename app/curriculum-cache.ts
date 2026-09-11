import type { LessonDefinition } from "./curriculum";

type CachedCurriculum = {
  revision: number;
  source: "published" | "bundled";
  savedAt: string;
  lessons: LessonDefinition[];
};

const databaseName = "linguathread-content-v2";
const storeName = "curriculum";
const recordKey = "english-spanish-vietnamese:reviewed-lessons:v2";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readCachedCurriculum(): Promise<CachedCurriculum | null> {
  if (!("indexedDB" in window)) return null;
  const database = await openDatabase();
  return new Promise<CachedCurriculum | null>((resolve, reject) => {
    const request = database.transaction(storeName).objectStore(storeName).get(recordKey);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

async function saveCachedCurriculum(value: CachedCurriculum) {
  if (!("indexedDB" in window)) return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value, recordKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => database.close());
}

function valid(value: unknown): value is CachedCurriculum {
  const candidate = value as Partial<CachedCurriculum>;
  return Number.isInteger(candidate?.revision) && Array.isArray(candidate.lessons) && candidate.lessons.length > 0
    && candidate.lessons.every((lesson) => typeof lesson?.id === "string"
      && typeof lesson?.title === "string"
      && Array.isArray(lesson?.vocabulary) && lesson.vocabulary.length >= 4
      && lesson.vocabulary.every((word) => typeof word?.word === "string" && typeof word?.english === "string" && typeof word?.vietnamese === "string")
      && Array.isArray(lesson?.mastery?.accepted) && lesson.mastery.accepted.length > 0);
}

export async function loadCurriculum(fallback: LessonDefinition[]) {
  const cached = await readCachedCurriculum().catch(() => null);
  try {
    const response = await fetch("/api/curriculum");
    if (!response.ok) throw new Error("Curriculum unavailable");
    const payload = await response.json() as CachedCurriculum;
    if (!valid(payload)) throw new Error("Invalid curriculum payload");
    if (payload.source === "bundled" && cached && cached.revision > payload.revision) {
      return { lessons: cached.lessons, revision: cached.revision, source: "cache" as const };
    }
    if (payload.source === "published") {
      await saveCachedCurriculum({ ...payload, savedAt: new Date().toISOString() }).catch(() => undefined);
    }
    return { lessons: payload.lessons, revision: payload.revision, source: payload.source };
  } catch {
    if (cached) return { lessons: cached.lessons, revision: cached.revision, source: "cache" as const };
    return { lessons: fallback, revision: 0, source: "bundled" as const };
  }
}
