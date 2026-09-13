import type { LanguageSelection } from "./language-profile";
import type { LearnerModel } from "./learning-engine";

export type StackSessionPlan = {
  focused: string[];
  available: string[];
  deferred: string[];
  explanation: string;
};

export function planStackSession(selections: LanguageSelection[], model: LearnerModel, limit = 3, now = new Date()): StackSessionPlan {
  const active = selections.filter((item) => item.status === "active").sort((a, b) => a.priority - b.priority);
  const scored = active.map((selection) => {
    const key = selection.language.toLocaleLowerCase();
    const progress = model.languages[key];
    const evidence = Object.values(model.evidence).filter((item) => item.language.toLocaleLowerCase() === key || item.edge?.toLanguage.toLocaleLowerCase() === key);
    const due = evidence.filter((item) => new Date(item.nextReviewAt) <= now).length;
    const weakness = progress?.weakSkills.length || evidence.filter((item) => item.score < 58).length;
    const newness = progress?.communicationPosition ? 0 : 100;
    return { language: selection.language, score: newness + due * 25 + weakness * 18 + Math.max(0, 20 - selection.priority) };
  }).sort((a, b) => b.score - a.score);
  const focused = scored.slice(0, Math.max(1, limit)).map((item) => item.language);
  const deferred = active.map((item) => item.language).filter((language) => !focused.includes(language));
  const explanation = deferred.length
    ? `${focused.join(" · ")} in today’s focused practice · ${deferred[0]} remains available and rotates next.`
    : `${focused.join(" · ")} in today’s focused practice.`;
  return { focused, available: active.map((item) => item.language), deferred, explanation };
}
