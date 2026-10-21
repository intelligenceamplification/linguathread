import type { FoundationLanguage } from "./multilingual-foundation";

export type ApprovedAudioClip = {
  id: string;
  language: FoundationLanguage;
  text: string;
  normalizedText: string;
  url: string;
  sha256: string;
  reviewedAt?: string;
  voice?: "male" | "female";
  preferred?: boolean;
};

export type ApprovedAudioPack = {
  schemaVersion: 1;
  packVersion: string;
  model: string;
  approvedAt: string | null;
  clips: ApprovedAudioClip[];
  blockedAudioSha256?: string[];
};

let packPromise: Promise<ApprovedAudioPack | null> | null = null;
let packRequestedAt = 0;

type NativeAudioWindow = Window & { __LINGUATHREAD_NATIVE_AUDIO_PACK__?: ApprovedAudioPack; webkit?: { messageHandlers?: { linguathreadAudio?: { postMessage: (payload: unknown) => void } } } };
let nativeRefresh: Promise<void> | null = null;

function refreshNativeLibrary() {
  if (nativeRefresh) return nativeRefresh;
  const native = (window as NativeAudioWindow).webkit?.messageHandlers?.linguathreadAudio;
  if (!native) return Promise.resolve();
  nativeRefresh = new Promise<void>((resolve) => {
    const finish = () => { window.removeEventListener("linguathread:native-audio-library-ready", finish); window.clearTimeout(timeout); nativeRefresh = null; resolve(); };
    const timeout = window.setTimeout(finish, 13_000);
    window.addEventListener("linguathread:native-audio-library-ready", finish, { once: true });
    try { native.postMessage({ action: "refreshLibrary" }); } catch { finish(); }
  });
  return nativeRefresh;
}

export function nativeAudioLessonWindow(course: Array<{ id: string; level: string; unit: number }>, currentId: string, reviewIds: string[] = []) {
  const current = course.find((lesson) => lesson.id === currentId);
  if (!current) return [];
  const units = [...new Set(course.map((lesson) => `${lesson.level}:${lesson.unit}`))];
  const start = units.indexOf(`${current.level}:${current.unit}`);
  const windowUnits = new Set(units.slice(start, start + 2));
  const known = new Set(course.map((lesson) => lesson.id));
  return [...new Set([...course.filter((lesson) => windowUnits.has(`${lesson.level}:${lesson.unit}`)).map((lesson) => lesson.id), ...reviewIds.filter((id) => known.has(id))])].slice(0, 16);
}

export function prepareNativeAudioWindow(course: Array<{ id: string; level: string; unit: number }>, currentId: string, reviewIds: string[] = []) {
  if (!requiresNativeApprovedAudio("es") || nativeAudioNeedsUpdate("es")) return;
  const lessonIds = nativeAudioLessonWindow(course, currentId, reviewIds);
  if (lessonIds.length) (window as NativeAudioWindow).webkit?.messageHandlers?.linguathreadAudio?.postMessage({ action: "prepareLessons", lessonIds });
}

export function requiresNativeApprovedAudio(language: FoundationLanguage) {
  return typeof window !== "undefined" && (language === "es" || language === "vi") && Boolean(
    (window as NativeAudioWindow).__LINGUATHREAD_NATIVE_AUDIO_PACK__ || (window as NativeAudioWindow).webkit?.messageHandlers?.linguathreadAudio,
  );
}

export function nativeAudioNeedsUpdate(language: FoundationLanguage) {
  return requiresNativeApprovedAudio(language) && !(window as NativeAudioWindow).__LINGUATHREAD_NATIVE_AUDIO_PACK__;
}

function selectClip(pack: ApprovedAudioPack | null, text: string, language: FoundationLanguage) {
  if (!pack?.approvedAt) return null;
  const normalized = normalizeAudioText(text);
  const blocked = new Set(pack.blockedAudioSha256 ?? []);
  const matches = pack.clips.filter((clip) => clip.language === language && clip.normalizedText === normalized && !blocked.has(clip.sha256));
  const reviewed = matches.filter((clip) => Boolean(clip.reviewedAt));
  const preferred = reviewed.filter((clip) => clip.preferred);
  const candidates = preferred.length ? preferred : reviewed.length ? reviewed : matches;
  return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

export function normalizeAudioText(text: string) {
  return text.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function approvedAudioFor(text: string, language: FoundationLanguage) {
  if (requiresNativeApprovedAudio(language)) {
    // A pre-catalog wrapper cannot handle refreshLibrary or approved clip URLs.
    // Do not wait for its nonexistent response or drop into legacy/system voices.
    if (nativeAudioNeedsUpdate(language)) return Promise.resolve(null);
    // The installed pack is authoritative even when a recording is absent.
    // Never consult the mixed legacy web pack for these native languages.
    const clip = selectClip((window as NativeAudioWindow).__LINGUATHREAD_NATIVE_AUDIO_PACK__ ?? null, text, language);
    if (clip) return Promise.resolve(clip);
    return refreshNativeLibrary().then(() => selectClip((window as NativeAudioWindow).__LINGUATHREAD_NATIVE_AUDIO_PACK__ ?? null, text, language));
  }
  if (!packPromise || Date.now() - packRequestedAt > 30_000) {
    packRequestedAt = Date.now();
    packPromise = fetch("/audio/packs/approved.json", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<ApprovedAudioPack> : null)
      .catch(() => null);
  }
  return packPromise.then((pack) => selectClip(pack, text, language));
}
