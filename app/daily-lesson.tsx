"use client";

import { useState } from "react";
import { createDailyLessonPlan, type LessonForTools, type TranslationExercise } from "./lesson-tools";

const normalize = (value: string) => value.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase().replace(/[¿?¡!.,;:“”'’]/g, "").replace(/\s+/g, " ");

export function DailyLesson({ course, current, dueIds, completedIds, onClose, onEvidence }: { course: LessonForTools[]; current: LessonForTools; dueIds: string[]; completedIds: string[]; onClose: () => void; onEvidence: (correct: boolean, language: string, lessonId: string) => void }) {
  const plan = createDailyLessonPlan(course, current, dueIds, completedIds);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "gentle" | "correct">("idle");
  const screens: Array<{ kind: "exercise"; exercise: TranslationExercise } | { kind: "vocabulary" } | { kind: "application" } | { kind: "complete" }> = [
    { kind: "exercise", exercise: plan.exercises[0] }, { kind: "vocabulary" }, { kind: "application" },
    { kind: "exercise", exercise: plan.exercises[1] }, { kind: "exercise", exercise: plan.exercises[2] },
    { kind: "exercise", exercise: plan.exercises[3] }, { kind: "complete" },
  ];
  const screen = screens[step];
  const advance = () => { setStep((value) => value + 1); setAnswer(""); setAttempts(0); setFeedback("idle"); };

  if (screen.kind === "vocabulary") return <DailyFrame eyebrow="Today · new language" title="A small new foundation.">
    <div className="daily-vocabulary">{plan.newVocabulary.map((word) => <div key={word.word}><strong>{word.word}</strong><span>English · {word.english}</span><span>Vietnamese · {word.vietnamese}</span></div>)}</div>
    <p className="contemplative-note wide">Two words are enough when they are carried into a living sentence.</p>
    <button className="primary-action" onClick={advance}>Place them in context <span aria-hidden="true">→</span></button>
    <button className="text-action" onClick={onClose}>Return to self-directed learning</button>
  </DailyFrame>;

  if (screen.kind === "application") return <DailyFrame eyebrow="Today · application" title={plan.application.target}>
    <div className="language-stack compact-stack"><div className="stack-line"><span>English anchor</span><strong>{plan.application.anchor}</strong></div><div className="stack-line"><span>Vietnamese bridge</span><strong>{plan.application.bridge}</strong></div></div>
    <p className="contemplative-note wide">{plan.application.note}</p>
    <button className="primary-action" onClick={advance}>Recall the meaning <span aria-hidden="true">→</span></button>
    <button className="text-action" onClick={onClose}>Return to self-directed learning</button>
  </DailyFrame>;

  if (screen.kind === "complete") return <DailyFrame eyebrow="Today · complete" title="The thread is in motion.">
    <p className="completion-copy">You reviewed, met new language, used it in context, and moved the meaning through more than one direction. Return whenever the work is useful.</p>
    <button className="primary-action" onClick={onClose}>Return to the lesson <span aria-hidden="true">→</span></button>
  </DailyFrame>;

  const { exercise } = screen;
  const modelVisible = attempts >= 3;
  const targetLabel = exercise.to === "Spanish" ? "Spanish" : exercise.to === "Vietnamese" ? "Vietnamese" : "English";
  const check = () => {
    const correct = exercise.accepted.map(normalize).includes(normalize(answer));
    onEvidence(correct, targetLabel, exercise.lessonId);
    setFeedback(correct ? "correct" : "gentle");
    if (!correct) setAttempts((value) => value + 1);
  };
  return <DailyFrame eyebrow={`Today · ${exercise.phase.replace("-", " ")}`} title={`Translate into ${exercise.to}.`}>
    <p className="instruction">{exercise.scope} scope · {exercise.from} → {exercise.to}</p>
    <p className="daily-prompt">{exercise.prompt}</p>
    <p className="bridge-reminder">{exercise.note}</p>
    {!modelVisible ? <>
      <input className="answer-field" autoFocus value={answer} onChange={(event) => { setAnswer(event.target.value); setFeedback("idle"); }} onKeyDown={(event) => event.key === "Enter" && check()} placeholder={`Write in ${exercise.to}`} aria-label={`${exercise.scope} translation into ${exercise.to}`} />
      {feedback === "idle" && <button className="primary-action" disabled={!answer.trim()} onClick={check}>Check translation</button>}
      {feedback === "gentle" && <div className="feedback gentle"><div><strong>Return to the structure.</strong><p>{attempts} of 3 attempts. The next step will keep the model in view.</p></div><button onClick={() => { setAnswer(""); setFeedback("idle"); }}>Try again <span aria-hidden="true">→</span></button></div>}
      {feedback === "correct" && <div className="feedback correct"><div><strong>Meaning carried across.</strong><p>The direction changes; the thought stays available.</p></div><button onClick={advance}>Continue <span aria-hidden="true">→</span></button></div>}
    </> : <div className="recovery-builder"><p className="recovery-intro"><strong>Here is the model.</strong><span>Type it to reinforce the direction, or leave this part for now.</span></p><div className="target-model"><span>Target model</span><strong>{exercise.answer}</strong></div><input className="answer-field" autoFocus value={answer} onChange={(event) => { setAnswer(event.target.value); setFeedback("idle"); }} onKeyDown={(event) => event.key === "Enter" && check()} placeholder="Type the model" aria-label="Supported daily translation" />{feedback !== "correct" && <button className="primary-action" onClick={check}>Check model</button>}{feedback === "correct" && <div className="feedback correct"><div><strong>Meaning rebuilt.</strong></div><button onClick={advance}>Continue <span aria-hidden="true">→</span></button></div>}<button className="text-action" onClick={advance}>Skip this part for now</button></div>}
    <button className="text-action" onClick={onClose}>Return to self-directed learning</button>
  </DailyFrame>;
}

function DailyFrame({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div className="focus-content daily-content"><p className="eyebrow">{eyebrow}</p><h1 className="exercise-title">{title}</h1>{children}</div>;
}
