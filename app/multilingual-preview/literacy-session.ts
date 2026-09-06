import { acceptsFoundationAnswer, foundationObjectives, type FoundationLanguage, type FoundationObjective } from "../multilingual-foundation";

export type LiteracyPath = "foundations" | "check";
export type LiteracyPhase = "choose" | "study" | "recognize" | "write" | "summary";
export type LiteracyEvidence = { objective: FoundationObjective; skill: "recognition" | "writing"; correct: boolean; supported: boolean };
export type LiteracySession = {
 version: 1; phase: LiteracyPhase; path: LiteracyPath; index: number;
 answer: string; input: "typed" | "assisted"; revealed: boolean;
 feedback: "idle" | "correct" | "retry"; evidence: LiteracyEvidence[];
 acknowledged?: boolean;
};
export const emptyLiteracy = (): LiteracySession => ({ version: 1, phase: "choose", path: "foundations", index: 0, answer: "", input: "typed", revealed: false, feedback: "idle", evidence: [] });
export function beginLiteracy(path: LiteracyPath): LiteracySession {
 return { ...emptyLiteracy(), path, phase: path === "foundations" ? "study" : "recognize" };
}
export function assessLiteracy(session: LiteracySession, language: FoundationLanguage, choice?: FoundationObjective): LiteracySession {
 if (!["recognize", "write"].includes(session.phase) || session.feedback === "correct") return session;
 const objective = foundationObjectives[session.index];
 const skill: LiteracyEvidence["skill"] = session.phase === "recognize" ? "recognition" : "writing";
 const correct = skill === "recognition" ? choice === objective : acceptsFoundationAnswer(objective, language, session.answer);
 // A model or prior wrong attempt makes this supported evidence, even after it is hidden.
 const supported = session.path === "foundations" || session.revealed || (skill === "writing" && session.input === "assisted") || session.evidence.some(item => item.objective === objective && item.skill === skill && !item.correct);
 return { ...session, feedback: correct ? "correct" : "retry", evidence: [...session.evidence, { objective, skill, correct, supported }].slice(-256) };
}
export function advanceLiteracy(session: LiteracySession): LiteracySession {
 if (session.phase === "study") return { ...session, phase: "recognize", feedback: "idle" };
 if (session.feedback !== "correct") return session;
 if (session.phase === "recognize") {
  if (session.path === "check" && session.index < 3) return { ...session, index: session.index + 1, feedback: "idle" };
  return { ...session, phase: "write", index: session.path === "check" ? 0 : session.index, answer: "", feedback: "idle", revealed: false };
 }
 if (session.phase !== "write") return session;
 const index = session.index + 1;
 return { ...session, index: Math.min(index, 3), phase: index === 4 ? "summary" : session.path === "foundations" ? "study" : "write", answer: "", feedback: "idle", revealed: false };
}
export function literacyCounts(session: LiteracySession) {
 const count = (skill: LiteracyEvidence["skill"], supported: boolean) => new Set(session.evidence.filter(e => e.skill === skill && e.correct && e.supported === supported).map(e => e.objective)).size;
 return { recognition: count("recognition", false), writing: count("writing", false), supportedRecognition: count("recognition", true), supportedWriting: count("writing", true) };
}
export function parseLiteracy(value: unknown): LiteracySession {
 if (!value || typeof value !== "object") return emptyLiteracy();
 const s = value as LiteracySession;
 if (s.version !== 1 || !["choose", "study", "recognize", "write", "summary"].includes(s.phase) || !["foundations", "check"].includes(s.path) || !Number.isInteger(s.index) || s.index < 0 || s.index > 3 || typeof s.answer !== "string" || s.answer.length > 2000 || !["typed", "assisted"].includes(s.input) || typeof s.revealed !== "boolean" || !["idle", "correct", "retry"].includes(s.feedback) || !Array.isArray(s.evidence) || s.evidence.length > 256 || !s.evidence.every(e => e && foundationObjectives.includes(e.objective) && ["recognition", "writing"].includes(e.skill) && typeof e.correct === "boolean" && typeof e.supported === "boolean")) return emptyLiteracy();
 if (s.phase === "summary" && !foundationObjectives.every(objective => ["recognition", "writing"].every(skill => s.evidence.some(e => e.objective === objective && e.skill === skill && e.correct)))) return emptyLiteracy();
 return { version: 1, phase: s.phase, path: s.path, index: s.index, answer: s.answer, input: s.input, revealed: s.revealed, feedback: s.feedback, acknowledged: s.phase === "summary" && s.acknowledged === true, evidence: s.evidence.map(e => ({ objective: e.objective, skill: e.skill, correct: e.correct, supported: e.supported })) };
}
