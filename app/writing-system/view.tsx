"use client";
import { useEffect, useRef, useState } from "react";
import ListenButton from "../listen-button";
import { languageInfo, type FoundationLanguage } from "../multilingual-foundation";
import type { ScriptTaskMode } from "../script-literacy";
import { assess, combine, edgeKey, edgeState, emptyProgress, migrateLegacy, parseProgress, recordAttempt, supportVisible, type Course, type Exercise, type InventoryItem, type Progress, type Unit } from "./model";
import "./writing-system.css";
import type { LessonDefinition } from "../curriculum";
import { courseMaterial, relatedVocabulary } from "./course-links";

type Outline = Omit<Unit, "exercises"> & { exerciseCount: number; skills: { key: string; direction: Exercise["direction"]; form: string }[] };
type Index = Omit<Course, "units"> & { units: Outline[] };
type Props = { language: FoundationLanguage; onClose: () => void; onEvidence?: (id: string, mode: ScriptTaskMode, correct: boolean, supported: boolean) => void; languages?: { id: FoundationLanguage; name: string }[]; onLanguage?: (language: FoundationLanguage) => void; currentLesson?: LessonDefinition };
const modeMap: Record<Exercise["direction"], ScriptTaskMode> = { recognize: "visual-recognition", "sound-form": "sound-to-form", "form-sound": "form-to-sound", compose: "component-assembly", meaning: "meaning-retrieval", input: "keyboard-reconstruction", transfer: "unseen-transfer" };
const progressKey = (language: string) => `linguathread.writing-progress.v1:${language}`;
const cacheKey = (language: string, version: number, unit: string) => `linguathread.writing-unit.v1:${language}:${version}:${unit}`;
function isIndex(value: unknown, language: string): value is Index {
 const v = value as Index; return Boolean(v && v.language === language && Number.isInteger(v.version) && v.version >= 5 && Array.isArray(v.units) && Array.isArray(v.tracks) && Array.isArray(v.inventory) && v.inventory.length && v.units.every(u => typeof u.id === "string" && Array.isArray(u.prerequisites) && Array.isArray(u.skills)));
}
function isUnit(value: unknown, id: string): value is Unit {
 const u = value as Unit; return Boolean(u && u.id === id && Array.isArray(u.exercises) && u.exercises.length && u.exercises.every(e => typeof e.answer === "string" && typeof e.skill === "string" && ["choice", "audio-choice", "compose", "input"].includes(e.kind)));
}
function order<T>(items: T[], seed: string): T[] {
 // Stable across a reload, different across exercises; never sort the answer to the front.
 const output = [...items]; let n = [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17);
 for (let i = output.length - 1; i > 0; i--) { n = (n * 1664525 + 1013904223) >>> 0; const j = n % (i + 1); [output[i], output[j]] = [output[j], output[i]]; }
 return output;
}
const evidenceDirections: Exercise["direction"][] = ["recognize", "sound-form", "form-sound", "input"];
function inventoryEvidence(item: InventoryItem, progress: Progress, now: number) {
 const states = evidenceDirections.map(direction => edgeState(progress.edges[`${item.skill}:${direction}`], now));
 const weights = { new: 0, weak: .12, learning: .3, review: .52, usable: .72, strong: 1 } as const;
 const value = states.reduce((sum, state) => sum + weights[state], 0) / states.length;
 const label = states.every(state => state === "strong") ? "Strong" : states.some(state => state === "weak") ? "Needs repair" : states.some(state => state !== "new") ? "Learning" : "Not introduced";
 return { value, label };
}

export default function WritingSystemView({ language, onClose, onEvidence, languages, onLanguage, currentLesson }: Props) {
 const [index, setIndex] = useState<Index>();
 const [progress, setProgress] = useState<Progress>(emptyProgress);
 const [unit, setUnit] = useState<Unit>();
 const [step, setStep] = useState(-1);
 const [answer, setAnswer] = useState("");
 const [parts, setParts] = useState<number[]>([]);
 const [result, setResult] = useState<"idle" | "correct" | "retry">("idle");
 const [helped, setHelped] = useState(false);
 const [method, setMethod] = useState<"keyboard" | "dictation">("keyboard");
 const [error, setError] = useState("");
 const [offline, setOffline] = useState(false);
 const [loading, setLoading] = useState(false);
 const [activeTrack, setActiveTrack] = useState("");
 const [clock, setClock] = useState(0);
 const [reviewOnly, setReviewOnly] = useState(false);
 const [heard, setHeard] = useState(false);
 const [showGuide, setShowGuide] = useState(true);
 const token = useRef(0), started = useRef(0), currentProgress = useRef(progress);
 const heading = useRef<HTMLHeadingElement>(null);
 const unitCache = useRef(new Map<string, Unit>());
 const inFlight = useRef(new Map<string, Promise<Unit>>());
 const exercise = unit?.exercises[step];
 const dir = language === "ar" ? "rtl" : "ltr";
 const answerLanguage = exercise?.answerLanguage || (exercise?.direction === "meaning" ? "en" : language);
 const answerDir = answerLanguage === "ar" ? "rtl" : "ltr";
 const material = currentLesson ? courseMaterial(currentLesson, language) : undefined;
 const related = unit && material ? relatedVocabulary(unit.forms, material.vocabulary) : [];

 useEffect(() => {
  if (!unit) return;
  heading.current?.focus();
  heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
 }, [unit, step]);

 useEffect(() => {
  const lifecycleToken = token;
  let cancelled = false; token.current++; unitCache.current.clear(); inFlight.current.clear();
  // Hydrate external device storage after mount; never read localStorage during SSR.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setUnit(undefined); setIndex(undefined); setActiveTrack(""); setError(""); setOffline(false); setLoading(false); setClock(Date.now());
  try {
   const next = migrateLegacy(parseProgress(JSON.parse(localStorage.getItem(progressKey(language)) || "null")), JSON.parse(localStorage.getItem(`linguathread.script-practice.v2:${language}`) || "null"));
   currentProgress.current = next; setProgress(next);
  } catch { currentProgress.current = emptyProgress(); setProgress(emptyProgress()); setError("Saved writing progress could not be read. Your main-course progress is unchanged."); }
  const key = `linguathread.writing-index.v1:${language}`;
  try { const cached = JSON.parse(localStorage.getItem(key) || "null"); if (isIndex(cached, language)) { setIndex(cached); setActiveTrack(cached.units.find(u => u.id === currentProgress.current.position)?.track || cached.tracks[0]?.id || ""); } } catch { /* Network can repair the index. */ }
  const controller = new AbortController();
  fetch(`/api/writing-system?language=${language}`, { signal: controller.signal }).then(async r => { if (!r.ok) throw Error(); const v: unknown = await r.json(); if (!isIndex(v, language)) throw Error(); if (cancelled) return; setIndex(v); setActiveTrack(track => track || v.units.find(u => u.id === currentProgress.current.position)?.track || v.tracks[0]?.id || ""); try { localStorage.setItem(key, JSON.stringify(v)); } catch { setError("This device cannot save downloaded units. Keep the app open until storage is available."); } }).catch(() => { if (!cancelled) setOffline(true); });
  return () => { cancelled = true; controller.abort(); lifecycleToken.current++; };
 }, [language]);

 function save(next: Progress) {
  currentProgress.current = next; setProgress(next);
  try { localStorage.setItem(progressKey(language), JSON.stringify(next)); } catch { setError("Progress could not be saved on this device. Keep the app open and free some storage before closing it."); }
 }
 async function loadUnit(id: string, version: number): Promise<Unit> {
  const key = cacheKey(language, version, id);
  const existing = unitCache.current.get(key); if (existing) return existing;
  try { const stored: unknown = JSON.parse(localStorage.getItem(key) || "null"); if (isUnit(stored, id)) { unitCache.current.set(key, stored); return stored; } } catch { /* Fetch validated content. */ }
  const pending = inFlight.current.get(key); if (pending) return pending;
  const request = fetch(`/api/writing-system?language=${language}&version=${version}&unit=${encodeURIComponent(id)}`).then(async r => {
   if (!r.ok) throw Error(r.status === 409 ? "The course has updated. Return to the lesson and reopen Writing System to refresh it; your progress is retained." : "This unit is not saved on the device yet. Reconnect to download it.");
   const data = await r.json(); if (data.version !== version || data.language !== language || !isUnit(data.unit, id)) throw Error("The unit could not be validated. Please reconnect and try again.");
   unitCache.current.set(key, data.unit); try { localStorage.setItem(key, JSON.stringify(data.unit)); } catch { /* Keep the current unit usable in memory. */ }
   return data.unit as Unit;
  }).finally(() => inFlight.current.delete(key));
  inFlight.current.set(key, request); return request;
 }
 // Called only by event handlers or completed asynchronous unit loading, never during render.
 // eslint-disable-next-line react-hooks/purity
 function resetTask() { setAnswer(""); setParts([]); setResult("idle"); setHelped(false); setMethod("keyboard"); setHeard(false); started.current = Date.now(); }
 async function open(id: string, check = false, review = false) {
  if (!index) return; const request = ++token.current; setLoading(true); setError("");
  try {
   const loaded = await loadUnit(id, index.version); if (request !== token.current) return;
   const p = currentProgress.current;
   const due = loaded.exercises.filter(e => p.edges[edgeKey(e)] && p.edges[edgeKey(e)].due <= Date.now());
   const selected = review && due.length ? { ...loaded, exercises: due } : loaded;
   setShowGuide(loaded.exercises.some(e => supportVisible(e, p, Date.now())));
   setUnit(selected); setReviewOnly(review); resetTask();
   const resume = !check && !review && p.session?.unit === id ? Math.min(p.session.index, loaded.exercises.length - 1) : check || review ? 0 : -1;
   setStep(resume);
   if (!check && !review && resume >= 0 && p.session?.unit === id) {
    setHelped(p.session.helped);
    if (p.session.correct && p.session.answer !== undefined && assess(loaded.exercises[resume], p.session.answer)) {
     setResult("correct"); setAnswer(p.session.answer);
    }
   }
   save({ ...p, position: id, introduced: [...new Set([...p.introduced, id])] });
   const nextUnits = index.units.filter(u => !p.completed.includes(u.id) && u.track === loaded.track).slice(0, 3);
   void Promise.allSettled(nextUnits.map(u => loadUnit(u.id, index.version)));
  } catch (e) { if (request === token.current) setError(e instanceof Error ? e.message : "Could not open unit."); }
  finally { if (request === token.current) setLoading(false); }
 }
 function start() { if (!unit) return; resetTask(); setStep(0); save({ ...currentProgress.current, session: { unit: unit.id, index: 0, helped: false } }); }
 function check(value: string) {
  if (!exercise || !unit || result === "correct" || (exercise.audio && !heard)) return;
  const correct = assess(exercise, value); setAnswer(value); setResult(correct ? "correct" : "retry");
  // Capture actual response latency inside the submit event, not the render-time review clock.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const next = recordAttempt(currentProgress.current, exercise, correct, helped, now, now - started.current, method);
  save({ ...next, session: reviewOnly ? next.session : { unit: unit.id, index: step, helped: helped || !correct, correct, answer: value } });
  onEvidence?.(exercise.skill, method === "dictation" && exercise.kind === "input" ? "device-dictation" : modeMap[exercise.direction], correct, helped);
  if (!correct) setHelped(true);
 }
 function next() {
  if (!unit || result !== "correct") return;
  const p = currentProgress.current;
  if (step + 1 >= unit.exercises.length) {
   save({ ...p, completed: reviewOnly ? p.completed : [...new Set([...p.completed, unit.id])], session: reviewOnly ? p.session : undefined }); setStep(unit.exercises.length);
   // This is the Continue click handler; refresh due states at the time of completion.
   // eslint-disable-next-line react-hooks/purity
   setClock(Date.now());
  } else { resetTask(); setStep(step + 1); if (!reviewOnly) save({ ...p, session: { unit: unit.id, index: step + 1, helped: false } }); }
 }
 function leaveUnit() { token.current++; setUnit(undefined); setClock(Date.now()); setLoading(false); }
 const choices = exercise?.choices ? order([...new Set(exercise.choices)], exercise.id) : [];
 const bank = exercise?.components ? order(exercise.components.map((text, id) => ({ text, id })), exercise.id) : [];
 const visibleUnits = index?.units.filter(u => !activeTrack || u.track === activeTrack) || [];
 const nextUnit = visibleUnits.find(u => !progress.completed.includes(u.id) && u.prerequisites.every(id => progress.completed.includes(id)));
 const dueUnits = visibleUnits.filter(u => u.skills.some(s => progress.edges[s.key] && progress.edges[s.key].due <= clock));

 return <section className="writing-system" aria-busy={loading}>
  <div className="writing-toolbar"><button className="text-action" onClick={unit ? leaveUnit : onClose}>{unit ? "Back to writing path" : "Return to lesson"}</button>{languages && languages.length > 1 && <label>Language<select value={language} onChange={e => onLanguage?.(e.target.value as FoundationLanguage)}>{languages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}</div>
  {error && <p role="alert">{error}</p>}
  {offline && <p role="status">Offline · Previously downloaded units remain available.</p>}
  {!index && <p role="status">{offline ? "Connect once to download your writing path." : "Opening your writing path…"}</p>}
  {index && !unit && <>
   <p className="eyebrow">{languageInfo(language).name} · Writing System</p><h1>Your path into the written language.</h1>
   <p>Recognize its forms. Understand how they combine. Read and reconstruct with increasing independence.</p>
   <div className="writing-summary"><span>{progress.completed.filter(id => index.units.some(u => u.id === id)).length} of {index.units.length} lessons practised</span><span>{Object.values(progress.edges).filter(e => edgeState(e, clock) === "strong").length} strong pathways</span></div>
   {progress.legacy.length > 0 && <p className="writing-note">Your {progress.legacy.length} earlier foundation completions are retained. The expanded path checks the additional skills separately.</p>}
   {index.editorialStatus !== "reviewed" && <p className="writing-note">Expanded curriculum · Language review in progress.</p>}
   {material?.sentence && <details className="writing-course-link"><summary>In your current lesson · {material.title}</summary><p>Bring these writing skills back to the same language in your {material.level} lesson.</p><p lang={language} dir={dir}>{material.sentence}</p><ListenButton text={material.sentence} language={language}/><p>{material.meaning}</p><button className="text-action" onClick={onClose}>Return to this lesson →</button></details>}
   <nav className="writing-tracks" aria-label="Writing system tracks"><button aria-pressed={!activeTrack} onClick={() => setActiveTrack("")}>All</button>{index.tracks.map(t => <button key={t.id} aria-pressed={activeTrack === t.id} onClick={() => setActiveTrack(t.id)}>{t.title}</button>)}</nav>
   {nextUnit && <div className="writing-next"><div><span className="eyebrow">Next lesson</span><h2>{nextUnit.title}</h2></div><button className="primary-action" disabled={loading} onClick={() => void open(nextUnit.id)}>Continue writing path →</button></div>}
   {dueUnits.length > 0 && <button className="quiet-action" disabled={loading} onClick={() => void open(dueUnits[0].id, false, true)}>Review a due pathway</button>}
   <div className="writing-inventory">{index.inventory.filter(section => !activeTrack || section.track === activeTrack).map(section => <section key={section.id} className="inventory-section"><header><div><span className="eyebrow">Complete inventory</span><h2>{section.title}</h2><p>{section.description}</p></div><span>{section.items.filter(item => inventoryEvidence(item, progress, clock).label === "Strong").length} of {section.items.length} strong</span></header><div className="inventory-grid">{section.items.map(item => {
    const evidence = inventoryEvidence(item, progress, clock); const outline = index.units.find(candidate => candidate.id === item.unitId); const ready = Boolean(outline && (progress.completed.includes(outline.id) || outline.prerequisites.every(id => progress.completed.includes(id))));
    return <button key={item.id} className="inventory-card" disabled={loading || !ready} onClick={() => void open(item.unitId)} aria-label={`${item.form}, ${item.label}. ${evidence.label}${ready ? "" : ". Locked"}`}><span className="inventory-form" lang={language} dir={dir}>{item.form}</span><span className="inventory-label">{item.label}</span><span className="inventory-meter" aria-hidden="true"><i style={{ width: `${Math.round(evidence.value * 100)}%` }}/></span><span className="sr-only">{evidence.label}</span>{!ready && <span className="inventory-lock" aria-hidden="true">Later</span>}</button>;
   })}</div></section>)}</div>
   <details className="writing-sequence"><summary>See the complete lesson sequence</summary>{index.tracks.filter(t => !activeTrack || t.id === activeTrack).map(track => <section className="writing-track" key={track.id}><h2>{track.title}</h2><p>{track.description}</p><ol>{visibleUnits.filter(u => u.track === track.id).map(u => {
    const completed = progress.completed.includes(u.id); const ready = completed || u.prerequisites.every(id => progress.completed.includes(id)); const learning = progress.introduced.includes(u.id);
    const states = u.skills.map(s => edgeState(progress.edges[s.key], clock));
    const state = states.includes("weak") ? "A pathway needs attention" : states.includes("review") ? "Review due" : states.every(s => s === "strong") ? "Strong across assessed pathways" : completed ? "Practised · Continue strengthening" : learning ? "Learning" : ready ? "Ready to begin" : "Later in this track";
    return <li key={u.id}><div><span className="eyebrow">{u.level} · {u.stage === "reading" ? "Connected reading" : u.stage}</span><h3 lang={u.stage === "forms" || u.stage === "words" ? language : "en"} dir={u.stage === "forms" || u.stage === "words" ? dir : "ltr"}>{u.title}</h3><span>{state}</span>{learning && <details><summary>See each pathway</summary><ul className="writing-edge-list">{u.skills.map(s => <li key={s.key}><span lang={language} dir={dir}>{s.form}</span><span>{s.direction.replaceAll("-", " → ")} · {edgeState(progress.edges[s.key], clock)}</span></li>)}</ul></details>}</div><div className="writing-unit-actions"><button className="quiet-action" disabled={loading || !ready} onClick={() => void open(u.id, false, completed)}>{completed ? "Practise again" : learning ? "Resume" : "Learn"}</button><button className="text-action" disabled={loading} onClick={() => void open(u.id, true)}>Demonstrate</button></div></li>;
   })}</ol></section>)}</details>
   <details className="writing-sources"><summary>Curriculum references</summary><p>Reading and writing outcomes follow CEFR. Script order follows the writing system and the academic references below.</p>{index.sources.map(s => <p key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}</details>
  </>}
  {unit && <>
   <p className="eyebrow">{languageInfo(language).name} · {unit.level} · {unit.stage} {step >= 0 && step < unit.exercises.length ? `· ${step + 1} of ${unit.exercises.length}` : ""}</p>
   <h1 ref={heading} tabIndex={-1}>{unit.title}</h1>
   {step === -1 && related.length > 0 && <details className="writing-course-link"><summary>These forms in your current lesson</summary>{related.map(word => <div key={word.form}><p lang={language} dir={dir}>{word.form}</p><ListenButton text={word.form} language={language}/><p>{word.meaning}</p></div>)}</details>}
   {step === -1 ? <><p>{showGuide ? unit.explanation : unit.objective}</p>{unit.example && <div className="writing-model"><p lang={language} dir={dir}>{unit.example}</p><ListenButton text={unit.example} language={language}/><p>{unit.meaning}</p></div>}{showGuide ? <div className="writing-form-guide">{unit.exercises.filter(e => e.direction === "recognize").map(e => <p key={e.id}><strong lang={language} dir={dir}>{e.answer}</strong><span>{e.reading || e.explanation}</span></p>)}</div> : <p className="writing-note">Reading aids have receded because these pathways have usable evidence. You can restore them at any time.</p>}<button className="text-action" onClick={() => setShowGuide(value => !value)}>{showGuide ? "Hide reading aids" : "Show reading aids"}</button><button className="primary-action" onClick={start}>Begin practice →</button></> : step >= unit.exercises.length ? <div className="writing-complete"><h2>Lesson practised.</h2><p>Your progress is saved. Further independent practice, separated over time, strengthens these pathways.</p><button className="primary-action" onClick={leaveUnit}>See your updated path →</button></div> : exercise && <>
    <p className="writing-prompt">{exercise.prompt}</p>
    {exercise.cue && <div className="writing-cue"><p lang={language} dir={dir}>{exercise.cue}</p>{exercise.kind !== "audio-choice" && <ListenButton text={exercise.cue} language={language} onUse={() => setHelped(true)}/>}</div>}
    {exercise.audio && <div className="writing-audio"><ListenButton text={exercise.audio} language={language} onPlayback={() => setHeard(true)}/>{!heard && <p>Listen before answering. The response unlocks when playback begins. If the voice is unavailable, return to the path and practise another skill.</p>}</div>}
    {(exercise.kind === "choice" || exercise.kind === "audio-choice") && <div className="writing-choices">{choices.map((choice, i) => <div key={choice}>{exercise.kind === "audio-choice" && <ListenButton text={exercise.choiceAudio?.[choice] || choice} language={language}/>}<button className="quiet-action" disabled={result === "correct" || Boolean(exercise.audio && !heard)} onClick={() => check(choice)} lang={answerLanguage} dir={answerDir}>{exercise.kind === "audio-choice" ? `Choose audio ${i + 1}` : choice}</button></div>)}</div>}
    {exercise.kind === "compose" && <><output className="writing-assembly" lang={language} dir={dir}>{combine(parts.map(i => exercise.components![i]), exercise.composition) || "…"}</output><div className="writing-bank">{bank.map(({text, id}) => <button className="quiet-action" key={id} disabled={parts.includes(id) || result === "correct"} onClick={() => { setParts([...parts, id]); setResult("idle"); }}>{/^\p{M}/u.test(text) ? `◌${text}` : text}</button>)}</div><button className="text-action" onClick={() => { setParts([]); setResult("idle"); }}>Clear</button><button className="primary-action" disabled={!parts.length || result === "correct"} onClick={() => check(combine(parts.map(i => exercise.components![i]), exercise.composition))}>Check composition</button></>}
    {exercise.kind === "input" && <><label className="writing-input">Your answer<input value={answer} lang={language} dir={dir} autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={2000} disabled={result === "correct"} onChange={e => { setAnswer(e.target.value); setResult("idle"); }} onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing && answer.trim()) check(answer); }}/></label><fieldset className="writing-method"><legend>Input method</legend><label><input type="radio" checked={method === "keyboard"} onChange={() => setMethod("keyboard")}/>Keyboard</label><label><input type="radio" checked={method === "dictation"} onChange={() => setMethod("dictation")}/>My device’s dictation</label></fieldset>{method === "dictation" && <p className="writing-note">Use your device’s dictation, then inspect the resulting text. This records dictation-assisted input separately from spelling through the keyboard.</p>}<button className="primary-action" disabled={!answer.trim() || result === "correct" || Boolean(exercise.audio && !heard)} onClick={() => check(answer)}>Check answer</button></>}
    <p role="status" className="writing-feedback">{result === "correct" ? "Correct. Your evidence is recorded." : result === "retry" ? "Check the exact form, its marks and order. Try again, or open the explanation." : ""}</p>
    {result === "correct" ? <button className="primary-action" onClick={next}>Continue →</button> : <details onToggle={e => { if (e.currentTarget.open) { setHelped(true); if (unit) save({ ...currentProgress.current, session: { unit: unit.id, index: step, helped: true } }); } }}><summary>Show explanation and model</summary><p>{exercise.explanation}</p><p className="writing-answer-model" lang={exercise.direction === "meaning" ? "en" : language} dir={dir}>{exercise.answer}</p>{exercise.direction !== "meaning" && <ListenButton text={exercise.answer} language={language}/>}</details>}
   </>}
  </>}
 </section>;
}
