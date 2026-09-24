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
};

export type ApprovedAudioPack = {
  schemaVersion: 1;
  packVersion: string;
  model: string;
  approvedAt: string | null;
  clips: ApprovedAudioClip[];
};

let packPromise: Promise<ApprovedAudioPack | null> | null = null;
let packRequestedAt = 0;

export function normalizeAudioText(text: string) {
  return text.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function approvedAudioFor(text: string, language: FoundationLanguage) {
  if (!packPromise || Date.now() - packRequestedAt > 30_000) {
    packRequestedAt = Date.now();
    packPromise = fetch("/audio/packs/approved.json", { cache: "no-store" })
      .then((response) => response.ok ? response.json() as Promise<ApprovedAudioPack> : null)
      .catch(() => null);
  }
  return packPromise.then((pack) => {
    if (!pack?.approvedAt) return null;
    const normalized = normalizeAudioText(text);
    const matches = pack.clips.filter((clip) => clip.language === language && clip.normalizedText === normalized);
    const reviewed = matches.filter((clip) => Boolean(clip.reviewedAt));
    const candidates = reviewed.length ? reviewed : matches;
    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  });
}
