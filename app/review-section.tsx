"use client";

import { useEffect, useRef, useState } from "react";
import type { LessonDefinition } from "./curriculum";
import { normalizeAnswer } from "./answer-assessment";
import { edgeEvidenceKey, reviewQueue, reviewTasks, type LearnerModel, type ReviewItem, type ReviewTask } from "./learning-engine";
import { AnswerField } from "./answer-field";
import ListenButton from "./listen-button";
import FlashcardRound, { type CardRating } from "./flashcard-round";
import { flashcardQueue, listeningReviewQueue, planFlashcards, type Flashcard } from "./reinforcement";
import { approvedAudioFor } from "./audio-pack";

const itemKey = (item: ReviewItem) => item.evidence.edge ? edgeEvidenceKey(item.lesson.id, item.evidence.edge) : item.lesson.id;

type ReviewResult = { task: ReviewTask; outcome: "independent" | "supported" | "revealed" };

function taskTitle(task: ReviewTask) {
  if (task.id.startsWith("stack-")) return `Connect the meaning in ${task.edge.toLanguage}`;
  if (task.edge.fromModality === "audio") return "Listen for meaning";
  if (task.edge.retrievalType === "reconstruction") return "Rebuild the structure";
  return task.edge.toModality === "meaning" ? "Recall the meaning" : `Build a sentence in ${task.edge.toLanguage}`;
}

function ReviewPlan({ tasks }: { tasks: ReviewTask[] }) {
  return <ol className="review-plan">{tasks.map(task => <li key={task.id}>{taskTitle(task)}</li>)}</ol>;
}

type Attempt = (item: ReviewItem, task: ReviewTask, correct: boolean, supported: boolean, session: string, latency: number) => void;

export default function ReviewSection({ course, model, languages, completedIds, onAttempt, onCardRating, onContinue }: {
  course: LessonDefinition[]; model: LearnerModel; languages: string[]; completedIds: string[];
  onAttempt: Attempt; onCardRating: CardRating; onContinue: () => void;
}) {
  const [mode, setMode] = useState<"Mistakes" | "Flashcards" | "Listening">("Mistakes");
  const [current, setCurrent] = useState<ReviewItem | null>(null);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [session, setSession] = useState("");
  const [finished, setFinished] = useState<string[]>([]);
  const queue = reviewQueue(course, model, languages).filter(item => item.reason === "Needs strengthening" && !finished.includes(itemKey(item)));
  const dueCards = flashcardQueue(course, model, completedIds, languages);
  const difficultCards = dueCards.filter(card => card.evidence?.lastFailureAt && card.reason === "Strengthen");
  if (cards) return <FlashcardRound cards={cards} onRating={onCardRating} onFinish={() => setCards(null)} />;
  if (current) return <ReviewRound key={session} item={current} languages={languages} session={session} onAttempt={onAttempt}
    onClose={() => setCurrent(null)} onFinish={() => { setFinished(ids => [...ids, itemKey(current)]); setCurrent(null); }} />;
  const start = (item: ReviewItem) => { setSession(crypto.randomUUID()); setCurrent(item); };
  return <div className="focus-content review-content">
    <p className="eyebrow">Review</p><h1>Make it stay.</h1>
    <p className="review-introduction">Focus on a difficulty, recall what you know, or listen for meaning. Your daily path uses the same learning records and review schedule.</p>
    <nav className="review-modes" aria-label="Review experiences">{(["Mistakes", "Flashcards", "Listening"] as const).map(label => <button key={label} className="text-action" aria-current={mode === label ? "page" : undefined} onClick={() => setMode(label)}>{label}</button>)}</nav>
    {finished.length > 0 && <p role="status" className="review-note">Review saved. Your place in the daily path is unchanged.</p>}
    {mode === "Mistakes" && <section aria-label="Mistakes"><h2 className="review-heading">Give difficult ideas another try.</h2><p className="review-note">Incorrect and supported responses that still need an independent check. A recent attempt gets a short rest before returning.</p>
      {difficultCards.length > 0 && <button className="quiet-action" onClick={() => setCards(planFlashcards(difficultCards, 6))}>Revisit difficult flashcards →</button>}
      {queue.length ? <div className="review-groups">{queue.map(item => <ReviewTopic key={item.lesson.id} item={item} languages={languages} onStart={() => start(item)} />)}</div> : <div className="review-empty"><h2>No mistakes waiting.</h2><p>When a response needs strengthening, it will appear here after a short pause. Flashcards and listening offer other ways to practise.</p></div>}
    </section>}
    {mode === "Flashcards" && <section aria-label="Flashcards"><h2 className="review-heading">Recall, reveal, reconnect.</h2><p className="review-note">Vocabulary, expressions, and patterns from material you have already encountered. Ratings adjust spacing without awarding independent mastery.</p>
      {dueCards.length ? <><p>{dueCards.length} cards ready · a short set of up to 6</p><button className="primary-action" onClick={() => setCards(planFlashcards(dueCards, 6))}>Start flashcards →</button><div className="review-groups">{Array.from(new Set(dueCards.map(c => c.lesson.title))).slice(0, 4).map(title => <p key={title} className="review-note">{title}</p>)}</div></> : <div className="review-empty"><h2>No cards due.</h2><p>Continue your daily path. Encountered material becomes available for recall after a short pause, and rated cards return when due.</p></div>}
    </section>}
    {mode === "Listening" && <ListeningTopics course={course} model={model} languages={languages} completedIds={completedIds} finished={finished} onStart={start} />}
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
      const vietnamese = item.evidence.language === "Vietnamese";
      const clip = await approvedAudioFor(vietnamese ? item.lesson.sentence.bridge : item.lesson.sentence.target, vietnamese ? "vi" : "es");
      return clip?.reviewedAt ? item : null;
    })).then(items => { if (!cancelled) setAvailable(items.filter((item): item is ReviewItem => item !== null)); });
    return () => { cancelled = true; };
  }, [course, model, completedIds, languages, finished]);
  return <section aria-label="Listening"><h2 className="review-heading">Recognize meaning by ear.</h2><p className="review-note">Listen before seeing the words. Each language has its own listening record; reading and flashcard ratings do not count as listening success.</p>
    {available === null ? <p role="status">Checking reviewed listening models…</p> : available.length ? <div className="review-groups">{available.map(item => <ReviewTopic key={`${item.lesson.id}:${item.evidence.language}`} item={item} languages={languages} onStart={() => onStart(item)} />)}</div> : <div className="review-empty"><h2>No listening review ready.</h2><p>Only due material with an available, reviewed recording appears here. Newly practised listening gets time to settle before returning.</p></div>}
  </section>;
}

function ReviewRound({ item, languages, session, onAttempt, onClose, onFinish }: {
  item: ReviewItem; languages: string[]; session: string; onAttempt: Attempt; onClose: () => void; onFinish: () => void;
}) {
  const tasks = reviewTasks(item, languages);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [complete, setComplete] = useState(false);
  if (complete) return <div className="focus-content review-content">
    <p className="eyebrow">Review complete · {item.lesson.level} · Unit {item.lesson.unit}</p>
    <h1>{item.lesson.title}</h1>
    <p className="review-introduction">You practised {item.lesson.skill} across {Array.from(new Set(tasks.map(task => task.edge.toLanguage))).join(" and ")}.</p>
    <ul className="review-results">{results.map(result => <li key={result.task.id}>
      <strong>{taskTitle(result.task)}</strong><span>{result.outcome === "independent" ? "Recalled independently" : result.outcome === "supported" ? "Completed with support" : "Model studied · try from memory later"}</span>
    </li>)}</ul>
    <p className="review-note">Guided practice helps you learn. A later independent check confirms what you remember.</p>
    <button className="primary-action" onClick={onFinish}>Back to review →</button>
  </div>;
  return <ReviewResponse key={position} item={item} task={tasks[position]} position={position + 1} tasks={tasks} supportedByEarlierReveal={revealed || position > 0}
    onAttempt={(task, correct, supported, latency) => {
      onAttempt(item, task, correct, supported, session, latency);
      if (correct) setResults(previous => [...previous, { task, outcome: supported ? "supported" : "independent" }]);
    }}
    onReveal={() => { setRevealed(true); setResults(previous => [...previous, { task: tasks[position], outcome: "revealed" }]); }} onClose={onClose}
    onNext={() => position + 1 < tasks.length ? setPosition(value => value + 1) : setComplete(true)} />;
}

function ReviewResponse({ item, task, position, tasks, supportedByEarlierReveal, onAttempt, onReveal, onClose, onNext }: {
  item: ReviewItem; task: ReviewTask; position: number; tasks: ReviewTask[]; supportedByEarlierReveal: boolean;
  onAttempt: (task: ReviewTask, correct: boolean, supported: boolean, latency: number) => void;
  onReveal: () => void; onClose: () => void; onNext: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "retry" | "correct" | "revealed">("idle");
  const [heard, setHeard] = useState(false);
  const [reviewedAudio, setReviewedAudio] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [textFallback, setTextFallback] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [independent, setIndependent] = useState(false);
  const started = useRef(0);
  useEffect(() => { started.current = Date.now(); }, []);
  const listening = task.edge.fromModality === "audio" && !textFallback;
  const locked = status === "correct" || status === "revealed";
  function check() {
    if (!answer.trim() || locked || (listening && !heard)) return;
    const correct = task.accepted.some(value => normalizeAnswer(value) === normalizeAnswer(answer));
    const effectiveTask = textFallback ? { ...task, edge: { ...task.edge, fromModality: "written" as const } } : task;
    const supported = supportedByEarlierReveal || attempted || (listening && !reviewedAudio) || textFallback;
    setIndependent(!supported);
    onAttempt(effectiveTask, correct, supported, Math.max(0, Date.now() - started.current));
    setAttempted(true); setStatus(correct ? "correct" : "retry");
  }
  return <div className="focus-content exercise-content">
    <button className="text-action" onClick={onClose}>← Review queue</button>
    <header className="review-context">
      <p className="eyebrow">{item.lesson.level} · Unit {item.lesson.unit} · {item.reason}</p>
      <h2>{item.lesson.title}</h2>
      <p>Focus: {item.lesson.skill}</p>
      <p className="review-step-label">Step {position} of {tasks.length} · {taskTitle(task)}</p>
      <progress className="review-progress" value={position - 1} max={tasks.length} aria-label="Review steps completed" />
      <details><summary>In this review</summary><ReviewPlan tasks={tasks} /></details>
    </header>
    <p className="translation-direction">{task.edge.fromLanguage} → {task.edge.toLanguage}{listening ? " · Listening" : ""}</p>
    <h1 className="exercise-title">{listening ? "What does the speaker mean?" : task.edge.toModality === "meaning" ? "Recall the meaning." : `Write in ${task.edge.toLanguage}.`}</h1>
    {!listening && <p className="review-prompt">{task.prompt}</p>}
    {position > 1 && <p className="review-note">Same meaning, another language. This is guided stacking practice.</p>}
    {listening && <>
      <ListenButton text={task.prompt} language={task.edge.fromLanguage === "Vietnamese" ? "vi" : "es"}
        onComplete={reviewed => { setHeard(true); setReviewedAudio(Boolean(reviewed)); }} onError={() => setAudioError(true)} />
      {audioError && <button className="text-action" onClick={() => setTextFallback(true)}>Audio unavailable · practise with text instead</button>}
    </>}
    <p className="instruction">{listening ? "Listen first, then write the meaning in English." : `Write the ${task.edge.toLanguage} response from memory.`}</p>
    <AnswerField value={answer} onChange={value => { setAnswer(value); if (!locked) setStatus("idle"); }} onEnter={check}
      label={`${task.edge.toLanguage} review answer`} placeholder={`Write in ${task.edge.toLanguage}`} disabled={locked} lang={task.edge.toLanguage === "Vietnamese" ? "vi" : task.edge.toLanguage === "Spanish" ? "es" : "en"} />
    {!locked && <button className="primary-action" disabled={!answer.trim() || (listening && !heard)} onClick={check}>Check response</button>}
    {status === "retry" && <p role="status">Not quite. Check the meaning and the accents, or reveal the model.</p>}
    {!locked && <button className="text-action" onClick={() => { setStatus("revealed"); onReveal(); }}>Reveal model</button>}
    {locked && <div className="feedback" role="status"><div>
      <p>{status === "correct" ? (independent ? "Correct · recalled independently." : "Correct with support. Check it from memory again later.") : "Model revealed · no independent success recorded."}</p>
      {listening && <p>{task.prompt}</p>}
      {/* Showing a checked answer can support later tasks in this short round. */}
      {status === "revealed" && <p>{task.answer}</p>}
    </div><button className="text-action" onClick={onNext}>{position < tasks.length ? `Next: ${taskTitle(tasks[position])} →` : "See review summary →"}</button></div>}
  </div>;
}
