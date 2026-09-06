import { foundationLanguages, type FoundationLanguage } from "../multilingual-foundation";
import { parseLiteracy, type LiteracySession } from "./literacy-session";
export type Progress = { lesson: number; stage: number; supported: number[]; draftAnswer: string; modelVisible: boolean; literacy: Partial<Record<FoundationLanguage, LiteracySession>> };
export const emptyProgress = (): Progress => ({ lesson: 0, stage: 0, supported: [], draftAnswer: "", modelVisible: false, literacy: {} });
export function parseProgress(value: unknown): Progress {
 if (!value || typeof value !== "object") return emptyProgress();
 const p = value as Partial<Progress>;
 if (!Number.isInteger(p.lesson) || Number(p.lesson) < 0 || Number(p.lesson) > 4 || !Number.isInteger(p.stage) || Number(p.stage) < 0 || Number(p.stage) > 3 || (p.lesson === 4 && p.stage !== 0) || !Array.isArray(p.supported) || !p.supported.every(n => Number.isInteger(n) && n >= 0 && n < 4)) return emptyProgress();
 const literacy: Progress["literacy"] = {};
 for (const { id } of foundationLanguages) if (p.literacy && typeof p.literacy === "object" && p.literacy[id]) literacy[id] = parseLiteracy(p.literacy[id]);
 // Legacy copied-input flags never become literacy evidence.
 return { lesson: Number(p.lesson), stage: Number(p.stage), supported: [...new Set(p.supported)], draftAnswer: typeof p.draftAnswer === "string" ? p.draftAnswer.slice(0, 2000) : "", modelVisible: p.modelVisible === true, literacy };
}
