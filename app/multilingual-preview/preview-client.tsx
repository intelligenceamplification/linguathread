"use client";
import { useState } from "react";
import { acceptsFoundationAnswer, foundationContent, foundationInstructions, foundationLanguages, foundationObjectives, foundationProgressKey, languageInfo, validStack, type FoundationLanguage, type FoundationStack } from "../multilingual-foundation";
import "./preview.css";
import Readiness from "./readiness";
import { emptyProgress as empty, parseProgress, type Progress } from "./progress";
import { emptyLiteracy, type LiteracySession } from "./literacy-session";
import { literacyCopy } from "./literacy-copy";
import dynamic from "next/dynamic";
import { FirstLaunchIntro } from "../first-launch-intro";
const ScriptCourseView = dynamic(() => import("./script-course-view"), { loading: () => <p role="status">Opening script lessons…</p> });

const direction = (id: FoundationLanguage) => id === "ar" ? "rtl" : "ltr";
function restore(key: string): Progress {
 try {
  const p = JSON.parse(localStorage.getItem(key) || "null");
  return parseProgress(p);
 } catch { /* Invalid draft progress must not affect published progress. */ }
 return empty();
}
export default function MultilingualPreview() {
 const [launchState, setLaunchState] = useState<"intro" | "app">("intro");
 const [stack, setStack] = useState<FoundationStack>({ anchor: "en", bridge: "vi", target: "es" });
 const [active, setActive] = useState(false);
 const [progress, setProgress] = useState<Progress>(empty);
 const [answer, setAnswer] = useState("");
 const [result, setResult] = useState<"idle" | "correct" | "retry">("idle");
 const [revealed, setRevealed] = useState(false);
 const [storageError, setStorageError] = useState(false);
 const [foundationLanguage, setFoundationLanguage] = useState<FoundationLanguage | null>(null);
 const [scriptLanguage, setScriptLanguage] = useState<FoundationLanguage | null>(null);
 const t = foundationInstructions[stack.anchor];
 const literacyText = literacyCopy(stack.anchor);
 const objective = foundationObjectives[Math.min(progress.lesson, 3)];
 const output = progress.stage === 1 ? stack.target : progress.stage === 2 ? stack.bridge : stack.anchor;
 const prompt = progress.stage === 3 ? stack.target : stack.anchor;
 const needsReadiness = progress.stage !== 0 && output !== stack.anchor && !progress.literacy[output]?.acknowledged;
 function clearAnswer() { setAnswer(""); setResult("idle"); setRevealed(false); }
 function save(next: Progress) {
  setProgress(next);
  try { localStorage.setItem(foundationProgressKey(stack), JSON.stringify(next)); setStorageError(false); }
  catch { setStorageError(true); }
 }
 function advance() {
  save(progress.stage < 3 ? { ...progress, stage: progress.stage + 1, draftAnswer: "", modelVisible: false } : { ...progress, lesson: progress.lesson + 1, stage: 0, draftAnswer: "", modelVisible: false });
  clearAnswer(); window.scrollTo(0, 0);
 }
 function check() { setResult(acceptsFoundationAnswer(objective, output, answer) ? "correct" : "retry"); }
 function saveLiteracy(language: FoundationLanguage, session: LiteracySession) {
  save({ ...progress, literacy: { ...progress.literacy, [language]: session } });
 }
 function expression(language: FoundationLanguage) {
  return <span lang={language} dir={direction(language)}>{foundationContent[language][objective].text}</span>;
 }
 if (launchState === "intro") return <FirstLaunchIntro onBegin={() => setLaunchState("app")} />;
 return <main className="app-shell pilot-shell">
  <header className="pilot-header"><span className="wordmark">LinguaThread</span><span>Multilingual foundation · Beta</span></header>
  <p className="pilot-notice">An early curriculum build for personal testing. Script content and four introductory expressions are available in every offered language; the full CEFR curriculum remains in authoring and review.</p>
  {!active ? <section className="pilot-setup">
   <p className="eyebrow">Your language architecture</p><h1>Build your stack.</h1><p>Choose the languages that will anchor, support and extend your learning.</p>
   {(["anchor", "bridge", "target"] as const).map(role => <label key={role}>{role === "anchor" ? "Native anchor" : role === "bridge" ? "Supporting bridge" : "Learning target"}
    <select aria-label={role} value={stack[role]} onChange={e => setStack({ ...stack, [role]: e.target.value as FoundationLanguage })}>
     {foundationLanguages.map(l => <option key={l.id} value={l.id}>{l.name} · {l.native}</option>)}
    </select>
   </label>)}
   {!validStack(stack) && <p role="alert">Choose three different languages.</p>}
   <button className="primary-action" disabled={!validStack(stack)} onClick={() => { const restored = restore(foundationProgressKey(stack)); setProgress(restored); clearAnswer(); setAnswer(typeof restored.draftAnswer === "string" ? restored.draftAnswer : ""); setRevealed(restored.modelVisible === true); setFoundationLanguage(null); setActive(true); window.scrollTo(0, 0); }}>Open this stack →</button>
  </section> : <>
   <nav className="pilot-navigation" aria-label="Preview navigation"><button className="quiet-action" onClick={() => { setScriptLanguage(null); setFoundationLanguage(null); setActive(false); }}>Change stack</button><span><bdi>{languageInfo(stack.anchor).native}</bdi> → <bdi>{languageInfo(stack.bridge).native}</bdi> → <bdi>{languageInfo(stack.target).native}</bdi></span><span>{Math.min(progress.lesson + 1, 4)} / 4</span><details><summary>Writing foundations</summary>{[stack.target, stack.bridge].map(language => <div key={language}><button className="quiet-action" onClick={() => { setScriptLanguage(language); setFoundationLanguage(null); }}>{languageInfo(language).name} · Script lessons</button><button className="text-action" onClick={() => { setScriptLanguage(null); setFoundationLanguage(language); }}>{languageInfo(language).name} · Expression check</button></div>)}</details></nav>
   <div className="progress-track" aria-label="Unit progress"><span style={{ width: String((progress.lesson * 4 + progress.stage) / 16 * 100) + "%" }} /></div>
   <section className="pilot-stage" lang={stack.anchor} dir={direction(stack.anchor)}><div className="focus-content">
    {scriptLanguage ? <ScriptCourseView key={scriptLanguage} language={scriptLanguage} onClose={() => setScriptLanguage(null)}/> : foundationLanguage ? <><Readiness key={foundationLanguage} language={foundationLanguage} anchor={stack.anchor} session={progress.literacy[foundationLanguage] || emptyLiteracy()} onChange={session => saveLiteracy(foundationLanguage, session)} onReady={() => setFoundationLanguage(null)}/><button className="text-action" onClick={() => setFoundationLanguage(null)}>{literacyText.return}</button></> : progress.lesson === 4 ? <>
     <h1>{t[8]}</h1><p className="pilot-notice" lang="en" dir="ltr">You completed the four-lesson pilot, not a CEFR level. {progress.supported.length} lesson(s) used a revealed model. More curriculum and editorial review are still needed.</p>
     <button className="primary-action" onClick={() => { save(empty()); clearAnswer(); }}>{t[9]}</button>
    </> : <>
     {!needsReadiness && <><p className="eyebrow">{progress.stage === 0 ? t[0] : progress.stage === 3 ? t[7] : t[1]}</p>
     <h1 className="pilot-expression">{expression(progress.stage === 0 ? stack.target : prompt)}</h1></>}
     {needsReadiness ? <Readiness key={output} language={output} anchor={stack.anchor} session={progress.literacy[output] || emptyLiteracy()} onChange={session => saveLiteracy(output, session)} onReady={() => saveLiteracy(output, { ...progress.literacy[output]!, acknowledged: true })}/> : progress.stage === 0 ? <>
      <div className="pilot-stack" dir="ltr">{([stack.anchor, stack.bridge]).map(language => <div className="pilot-line" key={language} data-language={language}><small>{languageInfo(language).native}</small><p>{expression(language)}</p></div>)}</div>
      <button className="primary-action" onClick={advance}>{t[6]}</button>
     </> : <>
      <p><bdi>{languageInfo(output).native}</bdi></p>
      {revealed && <p className="pilot-model">{expression(output)}</p>}
      <input className="answer-field" aria-label="Practice answer" lang={output} dir={direction(output)} autoComplete="off" autoCorrect="off" spellCheck={false} value={answer} onChange={e => { setAnswer(e.target.value); save({ ...progress, draftAnswer: e.target.value }); setResult("idle"); }} onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing && result !== "correct") check(); }} />
      <p role="status" className="pilot-feedback">{result === "correct" ? t[3] : result === "retry" ? t[4] : "\u00a0"}</p>
      {result === "correct" ? <button className="primary-action" onClick={advance}>{t[6]}</button> : <>
       <button className="primary-action" disabled={!answer.trim()} onClick={check}>{t[2]}</button>
       <button className="text-action" onClick={() => { setRevealed(true); save({ ...progress, modelVisible: true, supported: [...new Set([...progress.supported, progress.lesson])] }); }}>{t[5]}</button>
      </>}
     </>}
    </>}
   </div></section>
  </>}
  {storageError && <p role="alert" className="pilot-notice">This browser could not save draft progress. Progress may be lost when this page closes.</p>}
  <footer className="lesson-footer"><span>Beta progress stays with this installation</span><span>One shared web and iOS curriculum</span></footer>
 </main>;
}
