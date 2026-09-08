import type { ScriptLesson } from "./script-courses";
import type { ScriptTaskMode } from "./script-literacy";

// Stable within a lesson, but no universal answer position to learn by rote.
export function scriptChoices(lesson: ScriptLesson) {
 const choices = [...lesson.alternatives];
 const position = Array.from(lesson.id).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0) % (choices.length + 1);
 choices.splice(position, 0, lesson.answer);
 return choices;
}

export type ScriptPhase = "study" | "visual" | "sound" | "assemble" | "write" | "complete";
export type ScriptInputMode = "keyboard" | "dictation";
export type ScriptPractice = { phase: ScriptPhase; answer: string; result: "idle" | "correct" | "retry"; supported: boolean; attempts: number; inputMode: ScriptInputMode; passed: Partial<Record<ScriptTaskMode, boolean>>; assembly: string[]; completedAt?: number; reviewAt?: number; previousCompletion?: { completedAt: number; reviewAt: number; supported: boolean } };
export const newScriptPractice = (check = false): ScriptPractice => ({ phase: check ? "visual" : "study", answer: "", result: "idle", supported: !check, attempts: 0, inputMode: "keyboard", passed: {}, assembly: [] });
export function restartScriptPractice(previous: ScriptPractice | undefined, check = false): ScriptPractice {
 const previousCompletion = previous?.phase === "complete" ? { completedAt: previous.completedAt!, reviewAt: previous.reviewAt!, supported: previous.supported } : previous?.previousCompletion;
 return { ...newScriptPractice(check), previousCompletion };
}
export function hasScriptCompletion(state: ScriptPractice | undefined) { return state?.phase === "complete" || !!state?.previousCompletion; }
export function scriptAnswerMatches(lesson: ScriptLesson, answer: string) { return answer.normalize("NFC").trim() === lesson.answer.normalize("NFC").trim(); }
export function scriptInstruction(lesson: ScriptLesson, state: ScriptPractice) {
 if (state.phase === "visual") return lesson.prompt.replace(/^(Write|Enter|Type|Compose)\b/, "Choose");
 if (state.phase === "sound") return "Listen without reading the model, then choose the written form you heard.";
 if (state.phase === "assemble") return "Reconstruct the written form from its visible elements.";
 return lesson.prompt;
}
export function canAdvanceScript(state: ScriptPractice) {
 return state.result === "correct" && ["visual", "sound", "assemble", "write"].includes(state.phase);
}
function modeFor(state: ScriptPractice): ScriptTaskMode | null {
 if (state.phase === "visual") return "visual-recognition";
 if (state.phase === "sound") return "sound-to-form";
 if (state.phase === "assemble") return "component-assembly";
 if (state.phase === "write") return state.inputMode === "dictation" ? "device-dictation" : "keyboard-reconstruction";
 return null;
}
export function assessScript(lesson: ScriptLesson, state: ScriptPractice, answer: string): ScriptPractice {
 const mode = modeFor(state);
 if (!mode || state.result === "correct") return state;
 const correct = scriptAnswerMatches(lesson, answer);
 return { ...state, answer, result: correct ? "correct" : "retry", supported: state.supported || !correct, attempts: state.attempts + 1, passed: correct ? { ...state.passed, [mode]: true } : state.passed };
}
export function advanceScript(state: ScriptPractice, now: number): ScriptPractice {
 if (state.phase === "study") return { ...state, phase: "visual", answer: "", result: "idle" };
 if (!canAdvanceScript(state)) return state;
 if (state.phase === "visual") return { ...state, phase: "sound", answer: "", result: "idle" };
 if (state.phase === "sound") return { ...state, phase: "assemble", answer: "", result: "idle", assembly: [] };
 if (state.phase === "assemble") return { ...state, phase: "write", answer: "", result: "idle", inputMode: "keyboard" };
 if (state.phase === "write") return { ...state, phase: "complete", completedAt: now, reviewAt: now + (state.supported ? 1 : 3) * 86400000 };
 return state;
}
export function appendAssembly(lesson: ScriptLesson, state: ScriptPractice, component: string): ScriptPractice {
 if (state.phase !== "assemble" || state.result === "correct") return state;
 const assembly = [...state.assembly, component];
 const answer = assembly.join("");
 return { ...state, assembly, answer, result: answer === lesson.answer ? "correct" : "idle", passed: answer === lesson.answer ? { ...state.passed, "component-assembly": true } : state.passed };
}
export function parseScriptPractice(value: unknown): ScriptPractice | null {
 if (!value || typeof value !== "object") return null;
 const legacy = value as ScriptPractice & { recognition?: boolean };
 const s = { ...legacy, phase: (legacy.phase as string) === "recognize" ? "visual" : legacy.phase, inputMode: legacy.inputMode === "dictation" ? "dictation" : "keyboard", passed: legacy.passed || (legacy.recognition ? { "visual-recognition": true } : {}), assembly: Array.isArray(legacy.assembly) ? legacy.assembly : [] } as ScriptPractice;
 if (!["study", "visual", "sound", "assemble", "write", "complete"].includes(s.phase) || typeof s.answer !== "string" || s.answer.length > 2000 || !["idle", "correct", "retry"].includes(s.result) || typeof s.supported !== "boolean" || !Number.isInteger(s.attempts) || s.attempts < 0) return null;
 if (s.phase === "complete" && (s.result !== "correct" || !Number.isFinite(s.completedAt) || !Number.isFinite(s.reviewAt) || Number(s.reviewAt) <= Number(s.completedAt))) return null;
 const previous = s.previousCompletion;
 const previousCompletion = previous && Number.isFinite(previous.completedAt) && Number.isFinite(previous.reviewAt) && previous.reviewAt > previous.completedAt && typeof previous.supported === "boolean" ? { ...previous } : undefined;
 return { phase: s.phase, answer: s.answer, result: s.result, supported: s.supported, attempts: s.attempts, inputMode: s.inputMode, passed: s.passed, assembly: s.assembly.filter((item): item is string => typeof item === "string"), completedAt: s.completedAt, reviewAt: s.reviewAt, previousCompletion };
}
