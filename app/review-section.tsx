"use client";

import { useEffect, useRef, useState } from "react";
import type { LessonDefinition } from "./curriculum";
import { normalizeAnswer } from "./answer-assessment";
import { reviewQueue, reviewTasks, type LearnerModel, type ReviewItem, type ReviewTask } from "./learning-engine";
import { AnswerField } from "./answer-field";
import ListenButton from "./listen-button";

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
    <h1>Strengthen what needs attention.</h1>
    <p className="review-introduction">Targeted recall from your attempts in Spanish and Vietnamese. Weak skills come first; due material follows. New lessons stay on your learning path.</p>
    {finished.length > 0 && <p role="status">Review saved. Your next lesson is unchanged.</p>}
    {queue.length ? <div className="unit-path" aria-label="Review queue">{queue.map(item => <button key={item.lesson.id} className="review-item" onClick={() => { setSession(crypto.randomUUID()); setCurrent(item); }}>
      <span className="eyebrow">{item.reason} · {item.evidence.language}</span>
      <strong>{item.lesson.title}</strong>
      <span>{item.lesson.skill} · {item.evidence.edge?.fromLanguage} → {item.evidence.edge?.toLanguage}</span>
      <span>Practise →</span>
    </button>)}</div> : <p className="instruction">Nothing needs review right now. Keep moving forward; your next due checks will appear here.</p>}
    <button className="primary-action" onClick={onContinue}>Continue learning <span aria-hidden="true">→</span></button>
  </div>;
}

function ReviewRound({ item, languages, session, onAttempt, onClose, onFinish }: {
  item: ReviewItem; languages: string[]; session: string; onAttempt: Attempt; onClose: () => void; onFinish: () => void;
}) {
  const tasks = reviewTasks(item, languages);
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  return <ReviewResponse key={position} task={tasks[position]} position={position + 1} total={tasks.length} supportedByEarlierReveal={revealed}
    onAttempt={(task, correct, supported, latency) => onAttempt(item, task, correct, supported, session, latency)}
    onReveal={() => setRevealed(true)} onClose={onClose}
    onNext={() => position + 1 < tasks.length ? setPosition(value => value + 1) : onFinish()} />;
}

function ReviewResponse({ task, position, total, supportedByEarlierReveal, onAttempt, onReveal, onClose, onNext }: {
  task: ReviewTask; position: number; total: number; supportedByEarlierReveal: boolean;
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
  const started = useRef(0);
  useEffect(() => { started.current = Date.now(); }, []);
  const listening = task.edge.fromModality === "audio" && !textFallback;
  const locked = status === "correct" || status === "revealed";
  function check() {
    if (!answer.trim() || locked || (listening && !heard)) return;
    const correct = task.accepted.some(value => normalizeAnswer(value) === normalizeAnswer(answer));
    const effectiveTask = textFallback ? { ...task, edge: { ...task.edge, fromModality: "written" as const } } : task;
    onAttempt(effectiveTask, correct, supportedByEarlierReveal || attempted || (listening && !reviewedAudio) || textFallback, Math.max(0, Date.now() - started.current));
    setAttempted(true); setStatus(correct ? "correct" : "retry");
  }
  return <div className="focus-content exercise-content">
    <button className="text-action" onClick={onClose}>← Review queue</button>
    <p className="eyebrow">Targeted review · {position} of {total}</p>
    <p className="translation-direction">{task.edge.fromLanguage} → {task.edge.toLanguage}{listening ? " · Listening" : ""}</p>
    <h1 className="exercise-title">{listening ? "What does the speaker mean?" : task.prompt}</h1>
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
      <p>{status === "correct" ? "Response recorded." : "Model revealed · no independent success recorded."}</p>
      {listening && <p>{task.prompt}</p>}
      {/* Showing a checked answer can support later tasks in this short round. */}
      {status === "revealed" && <p>{task.answer}</p>}
    </div><button className="text-action" onClick={onNext}>{position < total ? "Continue review →" : "Finish review →"}</button></div>}
  </div>;
}
