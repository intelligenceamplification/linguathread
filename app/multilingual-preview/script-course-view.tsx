"use client";
import { useEffect, useRef, useState } from "react";
import type { FoundationLanguage } from "../multilingual-foundation";
import type { ScriptLesson } from "../script-courses";
import { advanceScript, assessScript, hasScriptCompletion, newScriptPractice, parseScriptPractice, restartScriptPractice, scriptChoices, type ScriptPractice } from "../script-course-engine";
import ListenButton from "../listen-button";

type Index = { language: string; revision: number; convention: string; inventory: string; lessons: Pick<ScriptLesson, "id" | "title" | "prerequisites">[] };
function validIndex(value: unknown, language: string): value is Index {
 const i = value as Index;
 return !!i && i.language === language && Number.isInteger(i.revision) && i.revision > 0 && typeof i.convention === "string" && typeof i.inventory === "string" && Array.isArray(i.lessons) && i.lessons.length > 0 && i.lessons.every(l => typeof l.id === "string" && typeof l.title === "string" && Array.isArray(l.prerequisites) && l.prerequisites.every(p => typeof p === "string"));
}
function validUnit(value: unknown, id: string): value is ScriptLesson {
 const u = value as ScriptLesson;
 return !!u && u.id === id && [u.title, u.explanation, u.example, u.meaning, u.prompt, u.answer].every(v => typeof v === "string" && v.length > 0) && Array.isArray(u.alternatives) && u.alternatives.every(v => typeof v === "string") && Array.isArray(u.prerequisites);
}
export default function ScriptCourseView({ language, onClose }: { language: FoundationLanguage; onClose: () => void }) {
 const [index, setIndex] = useState<Index | null>(null);
 const [unit, setUnit] = useState<ScriptLesson | null>(null);
 const [practice, setPractice] = useState<ScriptPractice>(newScriptPractice);
 const [records, setRecords] = useState<Record<string, ScriptPractice>>({});
 const [error, setError] = useState("");
 const [storageError, setStorageError] = useState(false);
 const [loading, setLoading] = useState(false);
 const [reviewClock, setReviewClock] = useState(() => Date.now());
 const loadId = useRef(0);
 const progressKey = `linguathread.script-practice.draft.v1:${language}`;
 useEffect(() => {
  let cancelled = false;
  async function initialize() {
   try {
    const response = await fetch(`/api/script-course?language=${language}`);
    if (!response.ok) throw new Error("index");
    const data: unknown = await response.json();
    if (!validIndex(data, language)) throw new Error("index");
    if (cancelled) return;
    setIndex(data);
    try { localStorage.setItem(`linguathread.script-index.draft.v1:${language}`, JSON.stringify(data)); } catch { setStorageError(true); }
   } catch {
    try {
     const cached: unknown = JSON.parse(localStorage.getItem(`linguathread.script-index.draft.v1:${language}`) || "null");
     if (!validIndex(cached, language)) throw new Error("index");
     if (!cancelled) { setIndex(cached); setError("Offline: showing the last cached course index. Only previously saved units are available."); }
    } catch { if (!cancelled) setError("The course index is unavailable. Reconnect and reopen script lessons."); }
   }
   try {
    const saved = JSON.parse(localStorage.getItem(progressKey) || "{}");
    const restored: Record<string, ScriptPractice> = {};
    if (saved && typeof saved === "object") for (const [id, value] of Object.entries(saved)) { const record = parseScriptPractice(value); if (record) restored[id] = record; }
    if (!cancelled) setRecords(restored);
   } catch { if (!cancelled) setStorageError(true); }
  }
  void initialize();
  return () => { cancelled = true; loadId.current += 1; };
 }, [language, progressKey]);
 async function loadUnit(id: string, revision: number) {
  const key = `linguathread.script-unit.draft.v1:${language}:${id}:${revision}`;
  try { const cached: unknown = JSON.parse(localStorage.getItem(key) || "null"); if (validUnit(cached, id)) return cached; } catch { /* Fetch an uncached or invalid unit. */ }
  const response = await fetch(`/api/script-course?language=${language}&unit=${encodeURIComponent(id)}&revision=${revision}`);
  if (!response.ok) throw new Error("Unit unavailable. Reconnect and reopen the course to refresh its index.");
  const data = await response.json();
  if (data.language !== language || data.revision !== revision || !validUnit(data.unit, id)) throw new Error("This unit did not pass validation.");
  try { localStorage.setItem(key, JSON.stringify(data.unit)); } catch { setStorageError(true); }
  return data.unit as ScriptLesson;
 }
 async function openUnit(id: string, check = false, review = false) {
  if (!index) return;
  const request = ++loadId.current;
  setLoading(true); setError("");
  try {
   const lesson = await loadUnit(id, index.revision);
   if (request !== loadId.current) return;
   setUnit(lesson);
   const saved = records[`${index.revision}:${id}`];
   setPractice(check || review ? restartScriptPractice(saved, check) : saved || newScriptPractice());
   setLoading(false);
   // Yield until the chosen unit can paint before fetching the next two small units.
   setTimeout(() => { if (request !== loadId.current) return; const at = index.lessons.findIndex(l => l.id === id); void Promise.allSettled(index.lessons.slice(at + 1, at + 3).map(l => loadUnit(l.id, index.revision))); }, 100);
  } catch (e) { if (request === loadId.current) { setError(e instanceof Error ? e.message : "Unit unavailable."); setLoading(false); } }
 }
 function save(next: ScriptPractice) {
  if (!unit || !index) return;
  setPractice(next);
  const nextRecords = { ...records, [`${index.revision}:${unit.id}`]: next };
  setRecords(nextRecords);
  try { localStorage.setItem(progressKey, JSON.stringify(nextRecords)); setStorageError(false); } catch { setStorageError(true); }
 }
 const dir = language === "ar" ? "rtl" : "ltr";
 return <section lang="en" dir="ltr" className="script-course">
  <button className="text-action" onClick={onClose}>Return to stack</button>
  <p className="pilot-notice">Authored script lessons · Beta. Explanations are currently in English. Additional lessons and qualified editorial review remain underway.</p>
  {error && <p role="alert">{error}</p>}
  {storageError && <p role="alert">Local saving is unavailable. Keep this page open; recent work or downloaded units may not survive closing it.</p>}
  {loading && <p role="status">Opening lesson…</p>}
  {!index && !error && <p role="status">Loading script path…</p>}
  {index && !unit && <>
   <h1>Writing foundations</h1><p>{index.convention}</p>
   <details><summary>Reference forms</summary><p className="script-inventory" lang={language} dir={dir}>{index.inventory}</p></details>
   <ol className="script-path">{index.lessons.map(lesson => {
    const record = records[`${index.revision}:${lesson.id}`];
    const complete = record?.phase === "complete";
    const ready = lesson.prerequisites.every(id => hasScriptCompletion(records[`${index.revision}:${id}`]));
    return <li key={lesson.id}><h2>{lesson.title}</h2><p>{complete ? record.supported ? "Practised with support" : "Introductory check completed" : record?.previousCompletion ? "Review in progress · Previous completion retained" : record ? "In progress" : "Not completed"}{complete && record.reviewAt && record.reviewAt <= reviewClock ? " · Review due" : ""}</p>
     <button className="quiet-action" disabled={loading || !ready} onClick={() => void openUnit(lesson.id, false, complete)}>{complete ? "Review this lesson" : "Learn or resume"}</button>
     <button className="text-action" disabled={loading} onClick={() => void openUnit(lesson.id, true)}>Check this skill</button>
     {!ready && <small>Learn the earlier foundations first, or demonstrate this skill.</small>}
    </li>;
   })}</ol>
  </>}
  {index && unit && <>
   <button className="text-action" onClick={() => { loadId.current += 1; setUnit(null); setLoading(false); setReviewClock(Date.now()); }}>Back to script path</button>
   <h1>{unit.title}</h1>
   {practice.phase === "study" ? <><p>{unit.explanation}</p><p className="pilot-expression" lang={language} dir={dir}>{unit.example}</p><ListenButton text={unit.example} language={language}/><p>{unit.meaning}</p><button className="primary-action" onClick={() => save(advanceScript(practice, Date.now()))}>Practise recognition</button></> : practice.phase === "complete" ? <><h2>{practice.supported ? "Practised with support" : "Introductory check completed"}</h2><p>This records this lesson’s written task, not complete literacy or spoken proficiency. It will become due for review.</p><button className="primary-action" onClick={() => setUnit(null)}>Return to script path</button></> : <>
    <p>{unit.prompt}</p>
    {practice.phase === "recognize" ? <div className="readiness-choices">{scriptChoices(unit).map(choice => <button key={choice} className="quiet-action" lang={language} dir={dir} disabled={practice.result === "correct"} onClick={() => save(assessScript(unit, practice, choice))}>{choice}</button>)}</div> : <>
     <label>Write the form requested<input className="answer-field" lang={language} dir={dir} maxLength={2000} autoComplete="off" autoCorrect="off" spellCheck={false} value={practice.answer} onChange={e => save({ ...practice, answer: e.target.value, result: "idle" })} onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing && practice.answer.trim()) save(assessScript(unit, practice, practice.answer)); }}/></label>
     <label className="script-assistance"><input type="checkbox" checked={practice.supported} onChange={() => save({ ...practice, supported: true })}/>I used a model, dictation or other help. Once used, support stays recorded for this attempt.</label>
     {practice.result !== "correct" && <button className="primary-action" disabled={!practice.answer.trim()} onClick={() => save(assessScript(unit, practice, practice.answer))}>Check writing</button>}
    </>}
    <p role="status">{practice.result === "correct" ? "The written form matches." : practice.result === "retry" ? "Look again at the exact letters and marks. This task checks the specific written form, including its capitalization, spacing and punctuation." : "\u00a0"}</p>
    {practice.result === "correct" ? <button className="primary-action" onClick={() => save(advanceScript(practice, Date.now()))}>Continue</button> : <button className="text-action" onClick={() => save({ ...practice, phase: "study", supported: true, result: "idle" })}>Read the explanation and model</button>}
   </>}
  </>}
 </section>;
}
