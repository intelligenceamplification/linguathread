"use client";

import { useEffect, useRef, useState } from "react";
import type { LessonDefinition } from "./curriculum";
import { normalizeReviewAnswer, reviewPhraseTiles, reviewDirection } from "./review-language";
import { edgeEvidenceKey, reviewQueue, reviewTasks, type LearnerModel, type ReviewItem, type ReviewTask } from "./learning-engine";
import { AnswerField } from "./answer-field";
import ListenButton from "./listen-button";
import ReviewPhraseBuilder from "./review-phrase-builder";
import { speechLanguage } from "./speech";
import FlashcardRound, { type CardRating, type DailyCards } from "./flashcard-round";
import { flashcardCatalog, flashcardQueue, listeningReviewQueue, planFlashcards, type Flashcard } from "./reinforcement";
import { approvedAudioFor } from "./audio-pack";

const itemKey = (item: ReviewItem) => item.evidence.edge ? edgeEvidenceKey(item.lesson.id, item.evidence.edge) : item.lesson.id;

type ReviewResult = { task: ReviewTask; outcome: "independent" | "reconstructed" | "supported" | "revealed" };

function taskTitle(task: ReviewTask) {
  if (task.id.startsWith("stack-")) return `Connect the meaning in ${task.edge.toLanguage}`;
  if (task.edge.fromModality === "audio") return "Listen for meaning";
  if (task.edge.retrievalType === "reconstruction") return "Rebuild the structure";
  return task.edge.toModality === "meaning" ? "Recall the meaning" : `Recall a sentence in ${task.edge.toLanguage}`;
}

function ReviewPlan({ tasks }: { tasks: ReviewTask[] }) {
  return <ol className="review-plan">{tasks.map(task => <li key={task.id}>{taskTitle(task)}</li>)}</ol>;
}

type Attempt = (item: ReviewItem, task: ReviewTask, correct: boolean, supported: boolean, session: string, latency: number, eventId: string) => void;

export default function ReviewSection({ course, model, languages, completedIds, onAttempt, onRevealed, onCardRating, onContinue }: {
  course: LessonDefinition[]; model: LearnerModel; languages: string[]; completedIds: string[];
  onAttempt: Attempt; onRevealed: (item: ReviewItem, task: ReviewTask, eventId: string) => void; onCardRating: CardRating; onContinue: () => void;
}) {
  const [mode, setMode] = useState<"Strengthen" | "Flashcards" | "Listening">("Strengthen");
  const [current, setCurrent] = useState<ReviewItem | null>(null);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [savedCards, setSavedCards] = useState<DailyCards | undefined>();
  const [session, setSession] = useState("");
  const [finished, setFinished] = useState<string[]>([]);
  const [paused, setPaused] = useState<{ item: ReviewItem; session: string } | null>(null);
  const languageKey = languages.join(":");
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const cardDraft = JSON.parse(localStorage.getItem("nuevo-flow.review.cards.v1") || "null") as DailyCards | null;
        if (cardDraft && Array.isArray(cardDraft.ids) && typeof cardDraft.session === "string") {
          const catalog = flashcardCatalog(course, model, completedIds, languageKey.split(":"));
          const restoredCards = cardDraft.ids.map(id => catalog.find(card => card.id === id)).filter((card): card is Flashcard => Boolean(card));
          if (restoredCards.length === cardDraft.ids.length) { setSavedCards(cardDraft); setCards(restoredCards); return; }
        }
        const saved = JSON.parse(localStorage.getItem("nuevo-flow.review.active.v1") || "null");
        const lesson = course.find(entry => entry.id === saved?.lessonId);
        if (lesson && saved?.evidence?.edge && languageKey.split(":").includes(saved.evidence.language) && typeof saved.session === "string") {
          const draft = { item: { lesson, evidence: saved.evidence, reason: saved.reason } as ReviewItem, session: saved.session };
          if (saved.paused) setPaused(draft); else { setSession(draft.session); setCurrent(draft.item); }
        }
      } catch { /* Ignore an unreadable draft. */ }
    });
    return () => { cancelled = true; };
  }, [course, languageKey, model, completedIds]);
  const queue = reviewQueue(course, model, languages).filter(item => !finished.includes(itemKey(item)));
  const dueCards = flashcardQueue(course, model, completedIds, languages);
  if (cards) return <FlashcardRound cards={cards} savedRound={savedCards} onRoundChange={value => { localStorage.setItem("nuevo-flow.review.cards.v1", JSON.stringify(value)); }} onRating={onCardRating} onFinish={() => { localStorage.removeItem("nuevo-flow.review.cards.v1"); setSavedCards(undefined); setCards(null); }} />;
  if (current) return <ReviewRound key={session} item={current} languages={languages} session={session} onAttempt={onAttempt} onRevealed={onRevealed}
    onClose={() => { localStorage.setItem("nuevo-flow.review.active.v1", JSON.stringify({ lessonId: current.lesson.id, evidence: current.evidence, reason: current.reason, session, paused: true })); setPaused({ item: current, session }); setCurrent(null); }} onFinish={() => { localStorage.removeItem("nuevo-flow.review.active.v1"); localStorage.removeItem(`nuevo-flow.review.round.v1:${session}`); setPaused(null); for (const task of reviewTasks(current, languages)) localStorage.removeItem(`nuevo-flow.review.assistance.v1:${encodeURIComponent(itemKey(current))}:${task.id}`); setFinished(ids => [...ids, itemKey(current)]); setCurrent(null); }} />;
  const start = (item: ReviewItem, existingSession?: string) => { const id = existingSession || crypto.randomUUID(); localStorage.setItem("nuevo-flow.review.active.v1", JSON.stringify({ lessonId: item.lesson.id, evidence: item.evidence, reason: item.reason, session: id, paused: false })); setPaused(null); setSession(id); setCurrent(item); };
  return <div className="focus-content review-content review-landing">
    <p className="eyebrow">Review</p><h1>Make it stay.</h1>
    <p className="review-introduction">Return to what needs another listen or try.</p>
    <nav className="review-modes" aria-label="Review experiences">{(["Strengthen", "Flashcards", "Listening"] as const).map(label => <button key={label} className="text-action" aria-current={mode === label ? "page" : undefined} onClick={() => setMode(label)}>{label}</button>)}</nav>
    {paused && <section className="review-recommendation"><p className="eyebrow">Review in progress</p><h2>{paused.item.lesson.title}</h2><button className="primary-action" onClick={() => start(paused.item, paused.session)}>Resume review →</button></section>}
    {finished.length > 0 && <p role="status" className="review-note">Review saved. Your place in the daily path is unchanged.</p>}
    {mode === "Strengthen" && (queue.length ? <section className="review-recommendation" aria-label="Recommended review">
      <p className="eyebrow">Ready to revisit</p><p className="review-note">{queue[0].evidence.language} · {queue[0].lesson.level} · Unit {queue[0].lesson.unit}</p>
      <h2>{queue[0].lesson.title}</h2><p className="review-note">{queue[0].reason === "Needs strengthening" ? "A skill that needs another independent check." : "A skill ready for recall."}</p>
      <p>{taskTitle(reviewTasks(queue[0], languages)[0])}</p><button className="primary-action" onClick={() => start(queue[0])}>Start review →</button>
      {queue.length > 1 && <details><summary>More to strengthen</summary>{queue.slice(1).map(item => <ReviewTopic key={itemKey(item)} item={item} languages={languages} onStart={() => start(item)} />)}</details>}
    </section> : <div className="review-empty"><h2>Nothing to strengthen right now.</h2><p>When a response needs another try, it will appear here after a short pause.</p></div>)}
    {mode === "Flashcards" && <section className="review-recommendation" aria-label="Flashcards"><p className="eyebrow">Ready to revisit</p><h2>Recall, reveal, reconnect.</h2><p className="review-note">Bring familiar words and expressions to mind.</p>{dueCards.length ? <><p>{dueCards.length} cards ready · up to 6 per set</p><button className="primary-action" onClick={() => { const planned = planFlashcards(dueCards, 6); const saved = { ids: planned.map(card => card.id), session: crypto.randomUUID(), position: 0, revealed: false }; localStorage.setItem("nuevo-flow.review.cards.v1", JSON.stringify(saved)); setSavedCards(saved); setCards(planned); }}>Start review →</button></> : <div className="review-empty"><h2>No cards due.</h2><p>Encountered material becomes available after a short pause.</p></div>}</section>}
    {mode === "Listening" && <ListeningTopics course={course} model={model} languages={languages} completedIds={completedIds} finished={finished} onStart={start} />}
    <section className="review-alternatives"><h2>Other ways to review</h2>{(["Strengthen", "Flashcards", "Listening"] as const).filter(label => label !== mode).map(label => <button key={label} onClick={() => setMode(label)}><span><strong>{label}</strong><small>{label === "Flashcards" ? "Bring familiar words to mind" : label === "Listening" ? "Hear a phrase. Recall its meaning." : "Give a difficult skill another try"}</small></span><span aria-hidden="true">›</span></button>)}</section>
    <button className="text-action review-return" onClick={onContinue}>Continue Daily Learning Path →</button>
  </div>;
}

function ReviewTopic({ item, languages, onStart }: { item: ReviewItem; languages: string[]; onStart: () => void }) {
  const tasks = reviewTasks(item, languages);
  return <article className="review-item"><span className="eyebrow">{item.lesson.level} · Unit {item.lesson.unit} · {item.evidence.language}</span><strong>{item.lesson.title}</strong><span>Focus: {item.lesson.skill}</span><ReviewPlan tasks={tasks} /><button className="text-action review-start" onClick={onStart}>Start {tasks.length}-step review →</button></article>;
}

function ListeningTopics({ course, model, languages, completedIds, finished, onStart }: {
  course: LessonDefinition[]; model: LearnerModel; languages: string[]; completedIds: string[]; finished: string[]; onStart: (item: ReviewItem) => void;
}) {
  const [available, setAvailable] = useState<ReviewItem[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const candidates = listeningReviewQueue(course, model, completedIds, languages).filter(item => !finished.includes(itemKey(item)));
    Promise.all(candidates.map(async item => {
      const task = reviewTasks(item, languages)[0];
      const language = speechLanguage(task.edge.fromLanguage);
      if (!language) return null;
      const clip = await approvedAudioFor(task.prompt, language);
      return clip?.reviewedAt ? item : null;
    })).then(items => { if (!cancelled) setAvailable(items.filter((item): item is ReviewItem => item !== null)); });
    return () => { cancelled = true; };
  }, [course, model, completedIds, languages, finished]);
  return <section aria-label="Listening"><h2 className="review-heading">Recognize meaning by ear.</h2><p className="review-note">Listen before seeing the words. Each language has its own listening record; reading and flashcard ratings do not count as listening success.</p>
    {available === null ? <p role="status">Checking reviewed listening models…</p> : available.length ? <div className="review-groups">{available.map(item => <ReviewTopic key={`${item.lesson.id}:${item.evidence.language}`} item={item} languages={languages} onStart={() => onStart(item)} />)}</div> : <div className="review-empty"><h2>No listening review ready.</h2><p>Only due material with an available, reviewed recording appears here. Newly practised listening gets time to settle before returning.</p></div>}
  </section>;
}

function ReviewRound({ item, languages, session, onAttempt, onRevealed, onClose, onFinish }: {
  item: ReviewItem; languages: string[]; session: string; onAttempt: Attempt; onRevealed: (item: ReviewItem, task: ReviewTask, eventId: string) => void; onClose: () => void; onFinish: () => void;
}) {
  const tasks = reviewTasks(item, languages);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [complete, setComplete] = useState(false);
  const [roundReady, setRoundReady] = useState(false);
  const roundKey = `nuevo-flow.review.round.v1:${session}`;
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const saved = JSON.parse(localStorage.getItem(roundKey) || "null");
        if (saved) { if (Number.isInteger(saved.position) && saved.position >= 0 && saved.position < tasks.length) setPosition(saved.position); setRevealed(Boolean(saved.revealed)); if (Array.isArray(saved.results)) setResults(saved.results); setComplete(Boolean(saved.complete)); }
      } catch { /* Ignore an unreadable draft. */ }
      setRoundReady(true);
    });
    return () => { cancelled = true; };
  }, [roundKey, tasks.length]);
  useEffect(() => { if (roundReady) try { localStorage.setItem(roundKey, JSON.stringify({ position, revealed, results, complete })); } catch { /* Current practice remains usable. */ } }, [roundKey, roundReady, position, revealed, results, complete]);
  if (!roundReady) return <p role="status">Restoring review…</p>;
  if (complete) return <div className="focus-content review-content">
    <p className="eyebrow">Review complete · {item.lesson.level} · Unit {item.lesson.unit}</p>
    <h1>{item.lesson.title}</h1>
    <p className="review-introduction">You practised {item.lesson.skill} across {Array.from(new Set(tasks.map(task => task.edge.toLanguage))).join(" and ")}.</p>
    <ul className="review-results">{results.map(result => <li key={result.task.id}>
      <strong>{taskTitle(result.task)}</strong><span>{result.outcome === "independent" ? "Recalled independently" : result.outcome === "reconstructed" ? "Reconstructed independently" : result.outcome === "supported" ? "Completed with support" : "Model studied · try from memory later"}</span>
    </li>)}</ul>
    <p className="review-note">Guided practice helps you learn. A later independent check confirms what you remember.</p>
    <button className="primary-action" onClick={onFinish}>Back to review →</button>
  </div>;
  return <ReviewResponse key={position} session={session} item={item} task={tasks[position]} position={position + 1} tasks={tasks} supportedByEarlierReveal={revealed || position > 0}
    onAttempt={(task, correct, supported, latency, eventId) => {
      onAttempt(item, task, correct, supported, session, latency, eventId);
      if (correct) setResults(previous => [...previous, { task, outcome: supported ? "supported" : task.edge.retrievalType === "reconstruction" ? "reconstructed" : "independent" }]);
    }}
    onReveal={() => { onRevealed(item, tasks[position], `${session}:task:${position + 1}:revealed`); setRevealed(true); setResults(previous => [...previous, { task: tasks[position], outcome: "revealed" }]); }} onClose={onClose}
    onNext={() => position + 1 < tasks.length ? setPosition(value => value + 1) : setComplete(true)} />;
}

function ReviewResponse({ session, item, task, position, tasks, supportedByEarlierReveal, onAttempt, onReveal, onClose, onNext }: {
  session: string; item: ReviewItem; task: ReviewTask; position: number; tasks: ReviewTask[]; supportedByEarlierReveal: boolean;
  onAttempt: (task: ReviewTask, correct: boolean, supported: boolean, latency: number, eventId: string) => void;
  onReveal: () => void; onClose: () => void; onNext: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "retry" | "correct" | "revealed">("idle");
  const [heard, setHeard] = useState(false);
  const [reviewedAudio, setReviewedAudio] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [textFallback, setTextFallback] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [failures, setFailures] = useState(0);
  const [hinted, setHinted] = useState(false);
  const [targetHeard, setTargetHeard] = useState(false);
  const [wordBankSeen, setWordBankSeen] = useState(task.edge.retrievalType === "reconstruction");
  const [build, setBuild] = useState(task.edge.retrievalType === "reconstruction");
  const [listeningBuild, setListeningBuild] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [history, setHistory] = useState<number[][]>([]);
  const [restored, setRestored] = useState(false);
  const [independent, setIndependent] = useState(false);
  const storageKey = `nuevo-flow.review.assistance.v1:${encodeURIComponent(itemKey(item))}:${task.id}`;
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
    if (cancelled) return;
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved) { setAttempted(Boolean(saved.attempted)); setFailures(Number(saved.failures) || 0); setHinted(Boolean(saved.hinted)); setTargetHeard(Boolean(saved.targetHeard)); setWordBankSeen(Boolean(saved.wordBankSeen) || task.edge.retrievalType === "reconstruction"); setAnswer(typeof saved.answer === "string" ? saved.answer : ""); setSelected(Array.isArray(saved.selected) ? saved.selected : []); setBuild(Boolean(saved.build)); setListeningBuild(Boolean(saved.listeningBuild)); setStatus(saved.status === "correct" || saved.status === "revealed" || saved.status === "retry" ? saved.status : "idle"); setHeard(Boolean(saved.heard)); setReviewedAudio(Boolean(saved.reviewedAudio)); setTextFallback(Boolean(saved.textFallback)); setIndependent(Boolean(saved.independent)); }
    } catch { /* Ignore an unreadable draft. */ }
    setRestored(true);
    });
    return () => { cancelled = true; };
  }, [storageKey, task.edge.retrievalType]);
  useEffect(() => { if (restored) try { localStorage.setItem(storageKey, JSON.stringify({ attempted, failures, hinted, targetHeard, wordBankSeen, answer, selected, build, listeningBuild, status, heard, reviewedAudio, textFallback, independent })); } catch { /* Keep the current practice usable. */ } }, [storageKey, restored, attempted, failures, hinted, targetHeard, wordBankSeen, answer, selected, build, listeningBuild, status, heard, reviewedAudio, textFallback, independent]);
  function saveNow(patch: Record<string, unknown>) {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || "{}"); localStorage.setItem(storageKey, JSON.stringify({ ...saved, ...patch })); } catch { /* Current practice remains usable. */ }
  }
  const tileText = listeningBuild ? task.prompt : task.answer;
  const tileLanguage = listeningBuild ? task.edge.fromLanguage : task.edge.toLanguage;
  const tiles = reviewPhraseTiles(item.lesson, tileLanguage, tileText);
  const response = build ? selected.map(index => tiles[index]).join(" ") : answer;
  function changeTiles(next: number[]) { setHistory(previous => [...previous, selected]); setSelected(next); setStatus("idle"); }

  const started = useRef(0);
  useEffect(() => { started.current = Date.now(); }, []);
  const listening = task.edge.fromModality === "audio" && !textFallback;
  const locked = status === "correct" || status === "revealed";
  function check() {
    if (!restored || !response.trim() || locked || (listening && !heard)) return;
    const correct = (listeningBuild ? [task.prompt] : task.accepted).some(value => normalizeReviewAnswer(value, tileLanguage) === normalizeReviewAnswer(response, tileLanguage));
    const effectiveTask = { ...task, edge: { ...task.edge, ...(textFallback ? { fromModality: "written" as const } : {}), ...(build ? { retrievalType: "reconstruction" as const } : {}), ...(listeningBuild ? { toLanguage: task.edge.fromLanguage, toModality: "written" as const } : {}) } };
    const supported = supportedByEarlierReveal || attempted || hinted || targetHeard || (!build && wordBankSeen) || (listening && !reviewedAudio) || textFallback;
    setIndependent(!supported);
    saveNow({ attempted: true, failures: correct ? failures : failures + 1, status: correct ? "correct" : "retry", independent: !supported, answer, selected, build, listeningBuild, wordBankSeen, hinted, targetHeard, heard, reviewedAudio, textFallback });
    onAttempt(effectiveTask, correct, supported, Math.max(0, Date.now() - started.current), `${session}:task:${position}:attempt:${failures + 1}`);
    setAttempted(true); if (!correct) setFailures(value => value + 1); setStatus(correct ? "correct" : "retry");
  }
  return <div className="focus-content exercise-content review-exercise">
    <button className="text-action" onClick={onClose}>← Review queue</button>
    <header className="review-context">
      <p className="review-step-label">{item.lesson.title} <span>{position} of {tasks.length}</span></p>
      <progress className="review-progress" value={position - 1} max={tasks.length} aria-label="Review steps completed" />
    </header>
    <p className="translation-direction">{build ? "Guided practice" : `${task.edge.fromLanguage} → ${task.edge.toLanguage}${listening ? " · Listening" : ""}`}</p>
    <h1 className="exercise-title">{listening ? (listeningBuild ? "Build what you heard." : "What does the speaker mean?") : task.edge.toModality === "meaning" ? "Recall the meaning." : build ? "Build the phrase." : `Write in ${task.edge.toLanguage}.`}</h1>
    {!listening && <p className="review-prompt">{task.prompt.replace(/^Translate:\s*/i, "")}</p>}
    {position > 1 && <p className="review-note">Same meaning, another language. This is guided stacking practice.</p>}
    {listening && <>
      <ListenButton text={task.prompt} language={speechLanguage(task.edge.fromLanguage) || "en"} approvedOnly
        onComplete={reviewed => { setHeard(true); setReviewedAudio(Boolean(reviewed)); }} onError={() => setAudioError(true)} />
      {audioError && <button className="text-action" onClick={() => setTextFallback(true)}>Audio unavailable · practise with text instead</button>}
    </>}
    {listening && heard && !locked && <button className="text-action" onClick={() => { setListeningBuild(!listeningBuild); setBuild(!listeningBuild); if (!listeningBuild) { setWordBankSeen(true); saveNow({ wordBankSeen: true }); } setSelected([]); setAnswer(""); }}>{listeningBuild ? "Recall the meaning instead" : "Build the phrase you heard"}</button>}
    {!listening && task.edge.toModality === "written" && speechLanguage(task.edge.toLanguage) && <ListenButton text={task.answer} language={speechLanguage(task.edge.toLanguage)!} approvedOnly onPlayback={() => { saveNow({ targetHeard: true }); setTargetHeard(true); }} onError={() => setAudioError(true)} />}
    {!listening && audioError && <p className="review-note" role="status">Recording unavailable. Retry Listen or continue with text practice.</p>}
    {!build && <p className="instruction">{listening ? `Listen first, then write the meaning in ${task.edge.toLanguage}.` : `Write the ${task.edge.toLanguage} response from memory.`}</p>}
    {build ? <ReviewPhraseBuilder direction={reviewDirection(tileLanguage)} words={tiles} selected={selected} disabled={locked || (listening && !heard)} onChange={changeTiles} canUndo={history.length > 0} onUndo={() => { setSelected(history[history.length - 1]); setHistory(history.slice(0, -1)); setStatus("idle"); }} /> : <AnswerField value={answer} onChange={value => { setAnswer(value); if (!locked) setStatus("idle"); }} onEnter={check}
      label={`${task.edge.toLanguage} review answer`} placeholder={`Write in ${task.edge.toLanguage}`} disabled={locked} lang={speechLanguage(task.edge.toLanguage) || "en"} />}
    {!listening && task.edge.toModality === "written" && !locked && <button className="text-action" onClick={() => { if (!build) { setWordBankSeen(true); saveNow({ wordBankSeen: true }); } setBuild(!build); setSelected([]); setAnswer(""); }}>{build ? "Write my own response" : "Use word tiles"}</button>}
    {!locked && <button className="primary-action" disabled={!restored || !response.trim() || (listening && !heard)} onClick={check}>{build ? "Check phrase" : "Check response"}</button>}
    {status === "retry" && <p role="status">{failures >= 2 ? "Consider showing the answer, or try again." : "Not quite. Try again or open a hint."}</p>}
    {!locked && <div className="review-assistance">{failures > 0 && <button className="text-action" onClick={() => { saveNow({ hinted: true }); setHinted(true); }}>Hint</button>}<button className="text-action" onClick={() => { saveNow({ status: "revealed", attempted: true }); setStatus("revealed"); onReveal(); }}>Show answer</button></div>}
    {hinted && !locked && <p className="review-note">{task.hint || (task.edge.toLanguage === "Vietnamese" ? item.lesson.bridgeMastery.hint : item.lesson.transform.hint)}</p>}
    {locked && <div className="feedback" role="status"><div>
      <p>{status === "correct" ? (independent ? (build ? "Correct · reconstructed independently." : "Correct · recalled independently.") : "Correct with support. Check it from memory again later.") : "Model revealed · no independent success recorded."}</p>
      {listening && <p>{task.prompt}</p>}
      {/* Showing a checked answer can support later tasks in this short round. */}
      {status === "revealed" && <p>{listeningBuild ? task.prompt : task.answer}</p>}
    </div><button className="text-action" onClick={onNext}>{position < tasks.length ? `Next: ${taskTitle(tasks[position])} →` : "See review summary →"}</button></div>}
  </div>;
}
