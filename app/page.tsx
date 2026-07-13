"use client";

import { useEffect, useState } from "react";

type Stage = "vocabulary" | "recall" | "sentence" | "grammar" | "transform" | "mastery" | "complete" | "review";
type FeedbackState = "idle" | "correct" | "gentle";

const vocabulary = [
  { word: "yo", english: "I", vietnamese: "mình / tôi", note: "Spanish has one neutral first-person singular. Vietnamese chooses a pronoun through relationship and context." },
  { word: "tú", english: "you", vietnamese: "bạn", note: "Tú is informal singular. Like Vietnamese pronouns, it already says something about the relationship." },
  { word: "soy", english: "I am", vietnamese: "mình là / tôi là", note: "Soy is ser shaped for yo. Spanish can omit yo because the verb already carries it." },
  { word: "eres", english: "you are", vietnamese: "bạn là", note: "Eres is ser shaped for tú. Vietnamese là does not change with the person." },
  { word: "de", english: "from / of", vietnamese: "từ / của", note: "A small word that connects origin, belonging, material, and relationship." },
];

const stages: Stage[] = ["vocabulary", "recall", "sentence", "grammar", "transform", "mastery", "complete"];

export default function Home() {
  const [stage, setStage] = useState<Stage>("vocabulary");
  const [wordIndex, setWordIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [mastery, setMastery] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [accelerated, setAccelerated] = useState(false);

  useEffect(() => {
    setHasHistory(window.localStorage.getItem("polyflow.completed") === "true");
  }, []);

  const stageIndex = Math.max(0, stages.indexOf(stage));
  const progress = stage === "review" ? 100 : ((stageIndex + (stage === "vocabulary" ? wordIndex / vocabulary.length : 0)) / (stages.length - 1)) * 100;
  const currentWord = vocabulary[wordIndex];

  function advanceVocabulary() {
    if (wordIndex < vocabulary.length - 1) setWordIndex((value) => value + 1);
    else setStage("recall");
  }

  function checkLevel() {
    setAccelerated(true);
    setAnswer("");
    setFeedback("idle");
    setStage("mastery");
  }

  function checkRecall() {
    const normalized = answer.trim().toLowerCase().replace(/[.!]/g, "");
    setFeedback(["i am", "i'm", "am"].includes(normalized) ? "correct" : "gentle");
  }

  function checkMastery() {
    const normalized = answer.trim().toLowerCase().replace(/[.!]/g, "").replace(/\s+/g, " ");
    const passed = normalized === "soy de indiana" || normalized === "yo soy de indiana";
    setFeedback(passed ? "correct" : "gentle");
    setMastery(passed);
  }

  function resetAnswer(nextStage?: Stage) {
    setAnswer("");
    setFeedback("idle");
    if (nextStage) setStage(nextStage);
  }

  function learnFoundation() {
    setAccelerated(false);
    setWordIndex(0);
    resetAnswer("vocabulary");
  }

  function finishLesson() {
    window.localStorage.setItem("polyflow.completed", "true");
    window.localStorage.setItem("polyflow.spanish.foundation", accelerated ? "familiar" : "forming");
    setHasHistory(true);
    setStage("complete");
  }

  function restart() {
    setStage("vocabulary");
    setWordIndex(0);
    setAnswer("");
    setFeedback("idle");
    setMastery(false);
    setAccelerated(false);
  }

  return (
    <main className={`app-shell stage-${stage}`}>
      <header className="topline">
        <button className="wordmark" onClick={restart} aria-label="Restart lesson">PolyFlow</button>
        <div className="lesson-context">
          <span className="language-mark">ES</span>
          <span>Foundations · 01</span>
        </div>
        {hasHistory && stage !== "review" ? (
          <button className="quiet-action" onClick={() => setStage("review")}>Review</button>
        ) : <span className="header-balance" />}
      </header>

      {stage !== "complete" && stage !== "review" && (
        <div className="progress-track" aria-label={`Lesson ${Math.round(progress)}% complete`}>
          <span style={{ width: `${Math.max(4, progress)}%` }} />
        </div>
      )}

      <section className="lesson-stage" aria-live="polite">
        {stage === "vocabulary" && (
          <div className="focus-content vocab-content" key={currentWord.word}>
            <p className="eyebrow">Spanish foundation · {wordIndex + 1} of {vocabulary.length}</p>
            <h1>{currentWord.word}</h1>
            <div className="language-stack compact-stack">
              <StackLine role="Native anchor" language="English" value={currentWord.english} />
              <StackLine role="Fluent bridge" language="Vietnamese" value={currentWord.vietnamese} />
            </div>
            <p className="contemplative-note">{currentWord.note}</p>
            <button className="primary-action" onClick={advanceVocabulary}>
              {wordIndex === vocabulary.length - 1 ? "Practice the foundation" : "Continue"}
              <span aria-hidden="true">→</span>
            </button>
            {wordIndex === 0 && <button className="text-action calibration-action" onClick={checkLevel}>Already familiar? Check my level</button>}
          </div>
        )}

        {stage === "recall" && (
          <div className="focus-content exercise-content">
            <p className="eyebrow">Active recall</p>
            <h1 className="exercise-title">What does <em>soy</em> carry?</h1>
            <p className="instruction">Answer in English. Include the person as well as the verb.</p>
            <AnswerField value={answer} onChange={(value) => { setAnswer(value); setFeedback("idle"); }} onEnter={checkRecall} placeholder="Type your answer" label="Your answer" />
            {feedback === "idle" && <button className="primary-action" disabled={!answer.trim()} onClick={checkRecall}>Check</button>}
            {feedback === "correct" && <Feedback kind="correct" title="Yes. Soy carries “I am.”" detail="The Spanish verb ending holds information English places in two words." action="See the stack" onClick={() => resetAnswer("sentence")} />}
            {feedback === "gentle" && <Feedback kind="gentle" title="The verb is carrying both identity and person." detail="soy = I am" action="Try again" onClick={() => resetAnswer()} />}
          </div>
        )}

        {stage === "sentence" && (
          <div className="focus-content sentence-content">
            <p className="eyebrow">One meaning · three structures</p>
            <h1 className="sentence">Soy de Indiana.</h1>
            <div className="language-stack sentence-stack">
              <StackLine role="Native anchor" language="English" value="I am from Indiana." />
              <StackLine role="Fluent bridge" language="Vietnamese" value="Mình đến từ Indiana." />
            </div>
            <p className="contemplative-note wide">The meaning stays stable. Each language reveals a different way of organizing identity and origin.</p>
            <button className="primary-action" onClick={() => resetAnswer("grammar")}>See what changes <span aria-hidden="true">→</span></button>
          </div>
        )}

        {stage === "grammar" && (
          <div className="focus-content grammar-content">
            <p className="eyebrow">The stack beneath the sentence</p>
            <h1 className="grammar-line"><span>Soy</span> de Indiana.</h1>
            <div className="grammar-grid language-grammar-grid">
              <article><span className="grammar-language">Spanish · target</span><strong>soy + de</strong><p><em>Ser</em> changes into <em>soy</em> for “I.” The pronoun <em>yo</em> is optional because the verb already identifies the speaker.</p></article>
              <article><span className="grammar-language">English · anchor</span><strong>I + am + from</strong><p>English requires the subject and changes <em>be</em> to <em>am</em>. This familiar pattern helps make Spanish conjugation intelligible.</p></article>
              <article><span className="grammar-language">Vietnamese · bridge</span><strong>mình + đến từ</strong><p>The verb phrase does not conjugate. <em>Đến từ</em> literally carries “come from,” while the pronoun reflects relationship and context.</p></article>
            </div>
            <p className="insight">Spanish and English change the verb. Vietnamese keeps the verb stable. Spanish alone can let the conjugated verb stand without the pronoun.</p>
            <button className="primary-action" onClick={() => setStage("transform")}>Build the Spanish <span aria-hidden="true">→</span></button>
          </div>
        )}

        {stage === "transform" && <TransformExercise onComplete={() => resetAnswer("mastery")} />}

        {stage === "mastery" && (
          <div className="focus-content exercise-content">
            <p className="eyebrow">{accelerated ? "Fluency check" : "Foundation check"}</p>
            <h1 className="exercise-title">Translate: I am from Indiana.</h1>
            <p className="instruction">Write the natural Spanish. The subject pronoun may be omitted.</p>
            <AnswerField value={answer} onChange={(value) => { setAnswer(value); setFeedback("idle"); }} onEnter={checkMastery} placeholder="Escribe en español" label="Spanish answer" />
            {feedback === "idle" && <button className="primary-action" disabled={!answer.trim()} onClick={checkMastery}>Check understanding</button>}
            {feedback === "gentle" && accelerated && <Feedback kind="gentle" title="This foundation is worth making explicit." detail="Soy de Indiana. Spanish lets soy carry the subject." action="Learn the foundation" onClick={learnFoundation} />}
            {feedback === "gentle" && !accelerated && <Feedback kind="gentle" title="Let soy carry “I am.”" detail="Soy de Indiana." action="Try again" onClick={() => resetAnswer()} />}
            {feedback === "correct" && <Feedback kind="correct" title="Soy de Indiana." detail={accelerated ? "PolyFlow will move you through the foundations quickly and raise the level as your answers stay precise." : "You connected Spanish conjugation to both English and Vietnamese structure."} action="Complete lesson" onClick={finishLesson} />}
          </div>
        )}

        {stage === "complete" && (
          <div className="focus-content completion-content">
            <div className="completion-mark" aria-hidden="true">✓</div>
            <p className="eyebrow">Foundation mapped</p>
            <h1>{accelerated ? "This is already familiar." : "The first structure is in place."}</h1>
            <p className="completion-copy">{accelerated ? "PolyFlow recorded this foundation as fluent and will accelerate until the work becomes effortful enough to reveal your actual edge." : "PolyFlow recorded how you handled person, identity, and origin across Spanish, English, and Vietnamese."}</p>
            <div className="learning-signal">
              <span>{accelerated ? "Advance quickly" : "Becoming stable"}</span>
              <strong>Spanish · subject + ser</strong>
              <p>yo · soy · tú · eres · de</p>
            </div>
            <button className="primary-action" onClick={() => setStage("review")}>Review the stack <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={restart}>Preview next foundation</button>
          </div>
        )}

        {stage === "review" && (
          <div className="focus-content review-content">
            <button className="back-action" onClick={() => setStage(hasHistory ? "complete" : "vocabulary")} aria-label="Back">←</button>
            <p className="eyebrow">Quiet review</p>
            <h1>Your first Spanish stack</h1>
            <div className="review-list">
              {vocabulary.map((item, index) => (
                <div className="review-row stacked-review-row" key={item.word}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.word}</strong>
                  <p>{item.english} · {item.vietnamese}</p>
                  <em>{index < 3 ? "Stable" : "Forming"}</em>
                </div>
              ))}
            </div>
            <button className="primary-action" onClick={restart}>Return to lesson</button>
          </div>
        )}
      </section>

      <footer className="lesson-footer">
        <span>{stage === "complete" ? "Next · Spanish foundations" : "Spanish target · English anchor · Vietnamese bridge"}</span>
        <span>{mastery ? "Level signal recorded" : "Text-first · No streaks, no scores"}</span>
      </footer>
    </main>
  );
}

function StackLine({ role, language, value }: { role: string; language: string; value: string }) {
  return <div className="stack-line"><span>{role}<small>{language}</small></span><strong>{value}</strong></div>;
}

function AnswerField({ value, onChange, onEnter, placeholder, label }: { value: string; onChange: (value: string) => void; onEnter: () => void; placeholder: string; label: string }) {
  return <input className="answer-field" autoFocus value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onEnter()} placeholder={placeholder} aria-label={label} />;
}

function Feedback({ kind, title, detail, action, onClick }: { kind: "correct" | "gentle"; title: string; detail?: string; action: string; onClick: () => void }) {
  return <div className={`feedback ${kind}`}><div><strong>{title}</strong>{detail && <p>{detail}</p>}</div><button onClick={onClick}>{action} <span aria-hidden="true">→</span></button></div>;
}

function TransformExercise({ onComplete }: { onComplete: () => void }) {
  const words = ["Soy", "de", "Indiana."];
  const [chosen, setChosen] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  function choose(word: string) {
    if (!chosen.includes(word)) { setChosen([...chosen, word]); setChecked(false); }
  }

  return (
    <div className="focus-content transform-content">
      <p className="eyebrow">Build the target</p>
      <h1 className="exercise-title">I am from Indiana.</h1>
      <p className="bridge-reminder">English: I + am + from · Vietnamese: mình + đến từ</p>
      <div className="sentence-builder" aria-label="Your sentence">
        {chosen.length ? chosen.map((word) => <button key={word} onClick={() => { setChosen(chosen.filter((item) => item !== word)); setChecked(false); }}>{word}</button>) : <span>Build the natural Spanish</span>}
      </div>
      <div className="word-bank">
        {["Indiana.", "de", "Soy"].map((word) => <button key={word} disabled={chosen.includes(word)} onClick={() => choose(word)}>{word}</button>)}
      </div>
      {!checked && <button className="primary-action" disabled={chosen.length !== words.length} onClick={() => setChecked(true)}>Check structure</button>}
      {checked && chosen.join(" ") === words.join(" ") && <Feedback kind="correct" title="Natural and complete." detail="Soy already carries the speaker, so yo is not required." action="Final check" onClick={onComplete} />}
      {checked && chosen.join(" ") !== words.join(" ") && <Feedback kind="gentle" title="Let the conjugated verb lead." detail="Start with Soy..." action="Rebuild" onClick={() => { setChosen([]); setChecked(false); }} />}
    </div>
  );
}
