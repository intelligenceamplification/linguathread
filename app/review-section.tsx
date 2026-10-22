"use client";

import { useEffect, useRef, useState } from "react";
import type { LessonDefinition } from "./curriculum";
import { normalizeAnswer } from "./answer-assessment";
import { reviewQueue, reviewTasks, type LearnerModel, type ReviewItem, type ReviewTask } from "./learning-engine";
import { AnswerField } from "./answer-field";
import ListenButton from "./listen-button";

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

export default function ReviewSection({ course, model, languages, onAttempt, onContinue }: {
  course: LessonDefinition[]; model: LearnerModel; languages: string[]; onAttempt: Attempt; onContinue: () => void;
}) {
  const [current, setCurrent] = useState<ReviewItem | null>(null);
  const [session, setSession] = useState("");
  const [finished, setFinished] = useState<string[]>([]);
  const queue = reviewQueue(course, model, languages).filter(item => !finished.includes(item.lesson.id));
  if (current) return <ReviewRound key={session} item={current} languages={languages} session={session} onAttempt={onAttempt}
    onClose={() => setCurrent(null)} onFinish={() => { setFinished(ids => [...ids, current.lesson.id]); setCurrent(null); }} />;
  return <div className="focus-content review-content">
    <p className="eyebrow">Review</p>
    <h1>Your review.</h1>
    <p className="review-introduction">Choose a topic from your recent difficulties or material due for recall. Each short set checks one skill, then connects the same meaning across your active languages.</p>
    {finished.length > 0 && <p role="status">Review saved. Your next lesson is unchanged.</p>}
    {queue.length ? <div className="review-groups">{(["Needs strengthening", "Due for recall"] as const).map(reason => {
      const items = queue.filter(item => item.reason === reason);
      return items.length > 0 && <section key={reason} aria-label={reason}>
        <h2>{reason} <span className="review-count">{items.length}</span></h2>
        <p className="review-note">{reason === "Needs strengthening" ? "Skills where your last independent check needs another try." : "Previously practised material ready for a later memory check."}</p>
        {items.map(item => <article key={item.lesson.id} className="review-item">
          <span className="eyebrow">{item.lesson.level} · Unit {item.lesson.unit} · {item.evidence.language}</span>
          <strong>{item.lesson.title}</strong>
          <span>Focus: {item.lesson.skill}</span>
          <ReviewPlan tasks={reviewTasks(item, languages)} />
          <button className="text-action review-start" onClick={() => { setSession(crypto.randomUUID()); setCurrent(item); }}>Start {reviewTasks(item, languages).length}-step review →</button>
        </article>)}
      </section>;
    })}</div> : <div className="review-empty"><h2>No review due.</h2><p>There are no eligible weak or due skills in your selected languages right now. Continue learning; reviews will appear as your practice history develops.</p></div>}
    <button className="primary-action" onClick={onContinue}>Continue learning <span aria-hidden="true">→</span></button>
  </div>;
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
