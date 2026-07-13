"use client";

import { useEffect, useMemo, useState } from "react";

type Stage = "vocabulary" | "recall" | "sentence" | "grammar" | "transform" | "mastery" | "complete" | "review";

const vocabulary = [
  { word: "notar", meaning: "to notice", note: "Attention beginning to make contact." },
  { word: "respirar", meaning: "to breathe", note: "An action, and a way to return." },
  { word: "despacio", meaning: "slowly", note: "With less speed and more awareness." },
  { word: "presente", meaning: "present", note: "Here, available to this moment." },
  { word: "elegir", meaning: "to choose", note: "To respond deliberately rather than automatically." },
];

const stages: Stage[] = ["vocabulary", "recall", "sentence", "grammar", "transform", "mastery", "complete"];

export default function Home() {
  const [stage, setStage] = useState<Stage>("vocabulary");
  const [wordIndex, setWordIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"idle" | "correct" | "gentle">("idle");
  const [mastery, setMastery] = useState(0);
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    setHasHistory(window.localStorage.getItem("polyflow.completed") === "true");
  }, []);

  const stageIndex = Math.max(0, stages.indexOf(stage));
  const progress = stage === "review" ? 100 : ((stageIndex + (stage === "vocabulary" ? wordIndex / vocabulary.length : 0)) / (stages.length - 1)) * 100;
  const currentWord = vocabulary[wordIndex];
  const prompt = useMemo(() => {
    if (stage === "recall") return { eyebrow: "Active recall", title: "What does notar mean?", hint: "Answer in English." };
    if (stage === "sentence") return { eyebrow: "Put it to use", title: "Cuando respiro despacio, noto más.", hint: "When I breathe slowly, I notice more." };
    if (stage === "mastery") return { eyebrow: "Mastery", title: "Translate: I choose to breathe slowly.", hint: "Use elegir, respirar, and despacio." };
    return null;
  }, [stage]);

  function advanceVocabulary() {
    if (wordIndex < vocabulary.length - 1) setWordIndex((value) => value + 1);
    else setStage("recall");
  }

  function checkRecall() {
    const normalized = answer.trim().toLowerCase();
    if (normalized === "to notice" || normalized === "notice") {
      setFeedback("correct");
    } else {
      setFeedback("gentle");
    }
  }

  function checkMastery() {
    const normalized = answer.trim().toLowerCase().replace(/[.!]/g, "");
    const passed = normalized.includes("elijo") && normalized.includes("respirar") && normalized.includes("despacio");
    setFeedback(passed ? "correct" : "gentle");
    if (passed) setMastery(1);
  }

  function resetAnswer(nextStage?: Stage) {
    setAnswer("");
    setFeedback("idle");
    if (nextStage) setStage(nextStage);
  }

  function finishLesson() {
    window.localStorage.setItem("polyflow.completed", "true");
    setHasHistory(true);
    setStage("complete");
  }

  function restart() {
    setStage("vocabulary");
    setWordIndex(0);
    setAnswer("");
    setFeedback("idle");
    setMastery(0);
  }

  return (
    <main className={`app-shell stage-${stage}`}>
      <header className="topline">
        <button className="wordmark" onClick={restart} aria-label="Restart lesson">PolyFlow</button>
        <div className="lesson-context">
          <span className="language-mark">ES</span>
          <span>Presencia · 08</span>
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
            <p className="eyebrow">New vocabulary · {wordIndex + 1} of {vocabulary.length}</p>
            <h1>{currentWord.word}</h1>
            <p className="definition">{currentWord.meaning}</p>
            <p className="contemplative-note">{currentWord.note}</p>
            <button className="primary-action" onClick={advanceVocabulary}>
              {wordIndex === vocabulary.length - 1 ? "Practice these words" : "Continue"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}

        {stage === "recall" && prompt && (
          <div className="focus-content exercise-content">
            <p className="eyebrow">{prompt.eyebrow}</p>
            <h1 className="exercise-title">{prompt.title}</h1>
            <p className="instruction">{prompt.hint}</p>
            <input
              className="answer-field"
              autoFocus
              value={answer}
              onChange={(event) => { setAnswer(event.target.value); setFeedback("idle"); }}
              onKeyDown={(event) => event.key === "Enter" && checkRecall()}
              placeholder="Type your answer"
              aria-label="Your answer"
            />
            {feedback === "idle" && <button className="primary-action" disabled={!answer.trim()} onClick={checkRecall}>Check</button>}
            {feedback === "correct" && <Feedback kind="correct" title="Yes. Notar means to notice." action="See it in a sentence" onClick={() => resetAnswer("sentence")} />}
            {feedback === "gentle" && <Feedback kind="gentle" title="Think of becoming aware of something." detail="Notar means to notice." action="Try again" onClick={() => resetAnswer()} />}
          </div>
        )}

        {stage === "sentence" && prompt && (
          <div className="focus-content sentence-content">
            <p className="eyebrow">{prompt.eyebrow}</p>
            <h1 className="sentence">Cuando respiro <button className="inline-word" onClick={() => setFeedback(feedback === "idle" ? "correct" : "idle")}>despacio</button>, noto más.</h1>
            <p className="translation">{prompt.hint}</p>
            {feedback === "correct" && <p className="word-reveal"><strong>despacio</strong><span>slowly · describes how the breathing happens</span></p>}
            <p className="contemplative-note wide">Slowing down does not diminish perception. It often lets perception become more precise.</p>
            <button className="primary-action" onClick={() => resetAnswer("grammar")}>Understand the structure <span aria-hidden="true">→</span></button>
          </div>
        )}

        {stage === "grammar" && (
          <div className="focus-content grammar-content">
            <p className="eyebrow">How Spanish carries the thought</p>
            <h1 className="grammar-line"><span>Cuando</span> respiro despacio, <span>noto</span> más.</h1>
            <div className="grammar-grid">
              <article><strong>Cuando</strong><p>Like “when” in English, it introduces the condition or moment.</p></article>
              <article><strong>respiro / noto</strong><p>Spanish builds the subject into the verb. The <em>-o</em> ending already tells us “I.”</p></article>
              <article><strong>más</strong><p>“More” stays open here. Context supplies what becomes more noticeable.</p></article>
            </div>
            <p className="insight">English repeats “I.” Spanish lets the verb endings keep the sentence lighter.</p>
            <button className="primary-action" onClick={() => setStage("transform")}>Transform it <span aria-hidden="true">→</span></button>
          </div>
        )}

        {stage === "transform" && (
          <TransformExercise onComplete={() => resetAnswer("mastery")} />
        )}

        {stage === "mastery" && prompt && (
          <div className="focus-content exercise-content">
            <p className="eyebrow">{prompt.eyebrow}</p>
            <h1 className="exercise-title">{prompt.title}</h1>
            <p className="instruction">{prompt.hint}</p>
            <input
              className="answer-field"
              autoFocus
              value={answer}
              onChange={(event) => { setAnswer(event.target.value); setFeedback("idle"); }}
              onKeyDown={(event) => event.key === "Enter" && checkMastery()}
              placeholder="Escribe en español"
              aria-label="Spanish answer"
            />
            {feedback === "idle" && <button className="primary-action" disabled={!answer.trim()} onClick={checkMastery}>Check mastery</button>}
            {feedback === "gentle" && <Feedback kind="gentle" title="Almost. Let the verbs carry “I.”" detail="Elijo respirar despacio." action="Try again" onClick={() => resetAnswer()} />}
            {feedback === "correct" && <Feedback kind="correct" title="Elijo respirar despacio." detail="You produced the vocabulary and the first-person verb without prompting." action="Complete lesson" onClick={finishLesson} />}
          </div>
        )}

        {stage === "complete" && (
          <div className="focus-content completion-content">
            <div className="completion-mark" aria-hidden="true">✓</div>
            <p className="eyebrow">Lesson complete</p>
            <h1>You made attention speakable.</h1>
            <p className="completion-copy">Five words are now connected to meaning, grammar, and use. PolyFlow noticed strong recall and one emerging pattern.</p>
            <div className="learning-signal">
              <span>Becoming stable</span>
              <strong>First-person verbs</strong>
              <p>respiro · noto · elijo</p>
            </div>
            <button className="primary-action" onClick={() => setStage("review")}>Review what stayed <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={restart}>Preview next lesson · Vietnamese</button>
          </div>
        )}

        {stage === "review" && (
          <div className="focus-content review-content">
            <button className="back-action" onClick={() => setStage(hasHistory ? "complete" : "vocabulary")} aria-label="Back">←</button>
            <p className="eyebrow">Quiet review</p>
            <h1>What is becoming yours</h1>
            <div className="review-list">
              {vocabulary.map((item, index) => (
                <div className="review-row" key={item.word}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.word}</strong>
                  <p>{item.meaning}</p>
                  <em>{index < 3 ? "Stable" : "Forming"}</em>
                </div>
              ))}
            </div>
            <button className="primary-action" onClick={restart}>Return to lesson</button>
          </div>
        )}
      </section>

      <footer className="lesson-footer">
        <span>{stage === "complete" ? "Next · Vietnamese" : "A language practice for a more attentive life"}</span>
        <span>{mastery ? "Mastery recorded" : "Text-first · No streaks, no scores"}</span>
      </footer>
    </main>
  );
}

function Feedback({ kind, title, detail, action, onClick }: { kind: "correct" | "gentle"; title: string; detail?: string; action: string; onClick: () => void }) {
  return (
    <div className={`feedback ${kind}`}>
      <div><strong>{title}</strong>{detail && <p>{detail}</p>}</div>
      <button onClick={onClick}>{action} <span aria-hidden="true">→</span></button>
    </div>
  );
}

function TransformExercise({ onComplete }: { onComplete: () => void }) {
  const words = ["Cuando", "respiro", "despacio,", "noto", "más."];
  const [chosen, setChosen] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  function choose(word: string) {
    if (!chosen.includes(word)) { setChosen([...chosen, word]); setChecked(false); }
  }

  return (
    <div className="focus-content transform-content">
      <p className="eyebrow">Build the thought</p>
      <h1 className="exercise-title">When I breathe slowly, I notice more.</h1>
      <div className="sentence-builder" aria-label="Your sentence">
        {chosen.length ? chosen.map((word) => <button key={word} onClick={() => setChosen(chosen.filter((item) => item !== word))}>{word}</button>) : <span>Choose each part in order</span>}
      </div>
      <div className="word-bank">
        {["noto", "despacio,", "Cuando", "más.", "respiro"].map((word) => (
          <button key={word} disabled={chosen.includes(word)} onClick={() => choose(word)}>{word}</button>
        ))}
      </div>
      {!checked && <button className="primary-action" disabled={chosen.length !== words.length} onClick={() => setChecked(true)}>Check structure</button>}
      {checked && chosen.join(" ") === words.join(" ") && <Feedback kind="correct" title="The structure is yours." action="Final check" onClick={onComplete} />}
      {checked && chosen.join(" ") !== words.join(" ") && <Feedback kind="gentle" title="Start with the moment: Cuando..." action="Rebuild" onClick={() => { setChosen([]); setChecked(false); }} />}
    </div>
  );
}
