import type { FoundationLanguage } from "./multilingual-foundation";

export type ApprovedAudioClip = {
  id: string;
  language: FoundationLanguage;
  text: string;
  normalizedText: string;
  url: string;
  sha256: string;
};

export type ApprovedAudioPack = {
  schemaVersion: 1;
  packVersion: string;
  model: string;
  approvedAt: string | null;
  clips: ApprovedAudioClip[];
};

let packPromise: Promise<ApprovedAudioPack | null> | null = null;

export function normalizeAudioText(text: string) {
  return text.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function approvedAudioFor(text: string, language: FoundationLanguage) {
  packPromise ||= fetch("/audio/packs/approved.json", { cache: "no-cache" })
    .then((response) => response.ok ? response.json() as Promise<ApprovedAudioPack> : null)
    .catch(() => null);
  return packPromise.then((pack) => {
    if (!pack?.approvedAt) return null;
    const normalized = normalizeAudioText(text);
    return pack.clips.find((clip) => clip.language === language && clip.normalizedText === normalized) || null;
  });
}
