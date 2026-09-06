import type { ScriptLesson } from "./script-courses";

// Stable within a lesson, but no universal answer position to learn by rote.
export function scriptChoices(lesson: ScriptLesson) {
 const choices = [...lesson.alternatives];
 const position = Array.from(lesson.id).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) % (choices.length + 1);
 choices.splice(position, 0, lesson.answer);
 return choices;
}

export type ScriptPractice = { phase: "study" | "recognize" | "write" | "complete"; answer: string; result: "idle" | "correct" | "retry"; supported: boolean; recognition: boolean; attempts: number; completedAt?: number; reviewAt?: number; previousCompletion?: { completedAt: number; reviewAt: number; supported: boolean } };
export const newScriptPractice = (check = false): ScriptPractice => ({ phase: check ? "recognize" : "study", answer: "", result: "idle", supported: !check, recognition: false, attempts: 0 });
export function restartScriptPractice(previous: ScriptPractice | undefined, check = false): ScriptPractice {
 const previousCompletion = previous?.phase === "complete" ? { completedAt: previous.completedAt!, reviewAt: previous.reviewAt!, supported: previous.supported } : previous?.previousCompletion;
 return { ...newScriptPractice(check), previousCompletion };
}
export function hasScriptCompletion(state: ScriptPractice | undefined) { return state?.phase === "complete" || !!state?.previousCompletion; }
export function scriptAnswerMatches(lesson: ScriptLesson, answer: string) { return answer.normalize("NFC").trim() === lesson.answer.normalize("NFC").trim(); }
export function assessScript(lesson: ScriptLesson, state: ScriptPractice, answer: string): ScriptPractice {
 if (!["recognize", "write"].includes(state.phase) || state.result === "correct") return state;
 const correct = scriptAnswerMatches(lesson, answer);
 return { ...state, answer, result: correct ? "correct" : "retry", recognition: state.phase === "recognize" ? correct : state.recognition, supported: state.supported || !correct, attempts: state.attempts + 1 };
}
export function advanceScript(state: ScriptPractice, now: number): ScriptPractice {
 if (state.phase === "study") return { ...state, phase: "recognize", answer: "", result: "idle" };
 if (state.result !== "correct") return state;
 if (state.phase === "recognize") return { ...state, phase: "write", answer: "", result: "idle" };
 if (state.phase === "write" && state.recognition) return { ...state, phase: "complete", completedAt: now, reviewAt: now + (state.supported ? 1 : 3) * 86400000 };
 return state;
}
export function parseScriptPractice(value: unknown): ScriptPractice | null {
 if (!value || typeof value !== "object") return null;
 const s = value as ScriptPractice;
 if (!["study", "recognize", "write", "complete"].includes(s.phase) || typeof s.answer !== "string" || s.answer.length > 2000 || !["idle", "correct", "retry"].includes(s.result) || typeof s.supported !== "boolean" || typeof s.recognition !== "boolean" || !Number.isInteger(s.attempts) || s.attempts < 0) return null;
 if (s.phase === "complete" && (!s.recognition || s.result !== "correct" || !Number.isFinite(s.completedAt) || !Number.isFinite(s.reviewAt) || Number(s.reviewAt) <= Number(s.completedAt))) return null;
 const previous = s.previousCompletion;
 const previousCompletion = previous && Number.isFinite(previous.completedAt) && Number.isFinite(previous.reviewAt) && previous.reviewAt > previous.completedAt && typeof previous.supported === "boolean" ? { ...previous } : undefined;
 return { phase: s.phase, answer: s.answer, result: s.result, supported: s.supported, recognition: s.recognition, attempts: s.attempts, completedAt: s.completedAt, reviewAt: s.reviewAt, previousCompletion };
}
