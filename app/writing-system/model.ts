import type { FoundationLanguage } from "../multilingual-foundation";

export const stages = ["forms", "contrasts", "composition", "decoding", "words", "sentences", "reading"] as const;
export type Stage = typeof stages[number];
export type Direction = "recognize" | "sound-form" | "form-sound" | "compose" | "meaning" | "input" | "transfer";
export type Exercise = {
 id: string; skill: string; direction: Direction; kind: "choice" | "input" | "compose" | "audio-choice";
 prompt: string; cue?: string; audio?: string; answer: string; accepted?: string[];
 choices?: string[]; components?: string[]; composition?: "sequence" | "hangul";
 explanation: string; reading?: string; meaning?: string; transfer?: boolean; answerLanguage?: FoundationLanguage;
};
export type Unit = {
 id: string; title: string; track: string; stage: Stage; prerequisites: string[];
 level: "Foundation" | "A1" | "A2" | "B1" | "B2";
 objective: string; explanation: string; forms: string[]; example: string; meaning: string;
 exercises: Exercise[]; sourceIds: string[]; courseTerms: string[];
};
export type Course = {
 language: FoundationLanguage; version: number; title: string;
 tracks: { id: string; title: string; description: string }[];
 sources: { id: string; title: string; url: string }[];
 units: Unit[]; editorialStatus: "awaiting-language-review" | "reviewed";
};
export type Edge = {
 attempts: number; independent: number; supported: number; failures: number;
 days: string[]; examples: string[]; seenExamples?: string[]; transfers: number; last: number; due: number; interval: number;
 lastCorrect: boolean; latencyMs: number; inputMethod?: "keyboard" | "dictation";
};
export type Progress = {
 schema: 1; edges: Record<string, Edge>; introduced: string[]; completed: string[];
 legacy: string[]; position?: string; session?: { unit: string; index: number; helped: boolean; correct?: boolean; answer?: string };
};
export const emptyProgress = (): Progress => ({ schema: 1, edges: {}, introduced: [], completed: [], legacy: [] });
export const edgeKey = (exercise: Exercise) => `${exercise.skill}:${exercise.direction}`;

export function parseProgress(value: unknown): Progress {
 const output = emptyProgress();
 if (!value || typeof value !== "object") return output;
 const p = value as Partial<Progress>;
 const strings = (v: unknown): string[] => Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string"))] : [];
 output.introduced = strings(p.introduced); output.completed = strings(p.completed); output.legacy = strings(p.legacy);
 if (typeof p.position === "string") output.position = p.position;
 if (p.session && typeof p.session.unit === "string" && Number.isInteger(p.session.index) && p.session.index >= 0) output.session = { unit: p.session.unit, index: p.session.index, helped: Boolean(p.session.helped), correct: p.session.correct === true, answer: typeof p.session.answer === "string" ? p.session.answer : undefined };
 if (p.edges && typeof p.edges === "object") for (const [key, edge] of Object.entries(p.edges)) {
  if (!edge || ![edge.attempts, edge.independent, edge.supported, edge.failures, edge.transfers, edge.last, edge.due, edge.interval, edge.latencyMs].every(n => Number.isFinite(n) && n >= 0)) continue;
  output.edges[key] = { ...edge, days: strings(edge.days), examples: strings(edge.examples), seenExamples: edge.seenExamples ? strings(edge.seenExamples) : undefined, lastCorrect: Boolean(edge.lastCorrect) };
 }
 return output;
}

/** Old completion remains historical evidence; it never fabricates proficiency. */
export function migrateLegacy(progress: Progress, legacy: unknown): Progress {
 if (!legacy || typeof legacy !== "object") return progress;
 const ids = Object.entries(legacy).filter(([, v]) => v && typeof v === "object" && ((v as { phase?: string }).phase === "complete" || Boolean((v as { previousCompletion?: unknown }).previousCompletion))).map(([id]) => id.replace(/^\d+:/, ""));
 return { ...progress, legacy: [...new Set([...progress.legacy, ...ids])] };
}

export function assess(exercise: Exercise, answer: string) {
 const normalize = (text: string) => text.normalize("NFC").trim().replace(/[‘’]/g, "'");
 return [exercise.answer, ...(exercise.accepted || [])].some(v => normalize(v) === normalize(answer));
}
export function recordAttempt(progress: Progress, exercise: Exercise, correct: boolean, helped: boolean, now: number, latencyMs: number, inputMethod: "keyboard" | "dictation" = "keyboard"): Progress {
 // Dictation provides useful resulting-text evidence, but does not prove keyboard spelling.
 const key = inputMethod === "dictation" && exercise.kind === "input" ? `${edgeKey(exercise)}:dictation` : edgeKey(exercise);
 const prior = progress.edges[key];
 const firstEncounter = !prior || Boolean(prior.seenExamples && !prior.seenExamples.includes(exercise.id));
 const independent = (prior?.independent || 0) + Number(correct && !helped);
 const day = new Date(now).toISOString().slice(0, 10);
 const days = correct && !helped ? [...new Set([...(prior?.days || []), day])] : prior?.days || [];
 const interval = !correct ? 0 : helped ? 1 : Math.min(30, Math.max(1, (prior?.interval || 0) * (days.length > (prior?.days.length || 0) ? 2 : 1)));
 const edge: Edge = { attempts: (prior?.attempts || 0) + 1, independent, supported: (prior?.supported || 0) + Number(correct && helped), failures: (prior?.failures || 0) + Number(!correct), days, examples: correct && !helped ? [...new Set([...(prior?.examples || []), exercise.id])] : prior?.examples || [], transfers: (prior?.transfers || 0) + Number(correct && !helped && exercise.transfer), last: now, due: now + (interval ? interval * 86400000 : 600000), interval, lastCorrect: correct, latencyMs: Math.max(0, latencyMs), inputMethod };
 edge.transfers = (prior?.transfers || 0) + Number(correct && !helped && exercise.transfer && firstEncounter);
 edge.seenExamples = [...new Set([...(prior?.seenExamples || prior?.examples || []), exercise.id])];
 return { ...progress, edges: { ...progress.edges, [key]: edge } };
}
export function edgeState(edge: Edge | undefined, now: number): "new" | "learning" | "usable" | "strong" | "review" | "weak" {
 if (!edge) return "new";
 if (!edge.lastCorrect) return "weak";
 if (edge.due <= now) return "review";
 if (edge.independent >= 4 && edge.days.length >= 3 && edge.examples.length >= 2) return "strong";
 if (edge.independent >= 2 && edge.examples.length >= 2) return "usable";
 return "learning";
}
export function unitState(unit: Unit, progress: Progress, now: number) {
 const required = [...new Set(unit.exercises.map(edgeKey))];
 const states = required.map(key => edgeState(progress.edges[key], now));
 if (states.includes("weak")) return "weak";
 if (states.includes("review")) return "review";
 if (states.length && states.every(s => s === "strong") && unit.exercises.filter(e => e.transfer).every(e => (progress.edges[edgeKey(e)]?.transfers || 0) > 0)) return "strong";
 if (progress.completed.includes(unit.id)) return "practised";
 if (progress.introduced.includes(unit.id)) return "learning";
 return "new";
}
export function unlocked(unit: Unit, progress: Progress) {
 return progress.completed.includes(unit.id) || unit.prerequisites.every(id => progress.completed.includes(id));
}
export function reviewQueue(course: Course, progress: Progress, now: number): { unit: Unit; exercise: Exercise }[] {
 const seen = new Set<string>();
 return course.units.flatMap(unit => unit.exercises.map(exercise => ({ unit, exercise }))).filter(({ exercise }) => {
  const key = edgeKey(exercise); const edge = progress.edges[key];
  if (!edge || edge.due > now || seen.has(key)) return false;
  seen.add(key); return true;
 }).sort((a, b) => {
  const x = progress.edges[edgeKey(a.exercise)], y = progress.edges[edgeKey(b.exercise)];
  return Number(x.lastCorrect) - Number(y.lastCorrect) || x.due - y.due;
 });
}
export function supportVisible(exercise: Exercise, progress: Progress, now: number) {
 return !["usable", "strong"].includes(edgeState(progress.edges[edgeKey(exercise)], now));
}

const initials = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
const vowels = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
const finals = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];
export function combine(parts: string[], mode: Exercise["composition"] = "sequence") {
 if (mode !== "hangul") return parts.join("").normalize("NFC");
 const l = initials.indexOf(parts[0]), v = vowels.indexOf(parts[1]), t = finals.indexOf(parts[2] || "");
 return l >= 0 && v >= 0 && t >= 0 && parts.length <= 3 ? String.fromCharCode(0xac00 + (l * 21 + v) * 28 + t) : parts.join(" + ");
}
