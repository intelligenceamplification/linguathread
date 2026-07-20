"use client";

/* eslint-disable react-hooks/set-state-in-effect -- browser storage is loaded after hydration */

import { useEffect, useState } from "react";
import { curriculum, LessonDefinition, normalizeAnswer } from "./curriculum";
import {
  completeSession, emptyLearnerModel, evidenceKey, LearnerModel, masteryState,
  migrateCompletedLessons, recordEvidence, selectNextLesson,
} from "./learning-engine";

type Stage = "vocabulary" | "recall" | "sentence" | "grammar" | "transform" | "mastery" | "complete" | "review";
type FeedbackState = "idle" | "correct" | "gentle";
type Confidence = "developing" | "comfortable" | "strong";
type ProductionLanguage = "Spanish" | "Vietnamese";
type LanguageProfile = { native: string; second: string | null; secondConfidence: Confidence | null; additional: string[] };

const commonLanguages = [
  "English", "Spanish", "Vietnamese", "French", "Portuguese", "German",
  "Italian", "Mandarin Chinese", "Cantonese", "Japanese", "Korean", "Arabic",
  "Hindi", "Russian", "Dutch", "Turkish", "Indonesian", "Thai", "Tagalog", "Swahili",
];

const stages: Stage[] = ["vocabulary", "recall", "sentence", "grammar", "transform", "mastery", "complete"];
const learnerIdKey = "polyflow.learner-id.v1";
const learnerModelKey = "polyflow.learner-model.v1";

function learnerHeaders(json = false) {
  let learnerId = window.localStorage.getItem(learnerIdKey);
  if (!learnerId) {
    learnerId = crypto.randomUUID();
    window.localStorage.setItem(learnerIdKey, learnerId);
  }
  return { ...(json ? { "content-type": "application/json" } : {}), "x-polyflow-learner-id": learnerId };
}

export default function Home() {
  const [profile, setProfile] = useState<LanguageProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("polyflow.language-profile.v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<LanguageProfile>;
        if (parsed.native && Array.isArray(parsed.additional)) {
          setProfile({ native: parsed.native, second: parsed.second || null, secondConfidence: parsed.second ? (parsed.secondConfidence || "developing") : null, additional: parsed.additional });
        }
      } catch { window.localStorage.removeItem("polyflow.language-profile.v1"); }
    }
    setLoaded(true);
  }, []);

  function saveProfile(nextProfile: LanguageProfile) {
    window.localStorage.setItem("polyflow.language-profile.v1", JSON.stringify(nextProfile));
    setProfile(nextProfile);
    setEditingProfile(false);
  }

  if (!loaded || !profile) return <LanguageSetup onComplete={saveProfile} />;
  if (editingProfile) return <LanguageSetup initialProfile={profile} onComplete={saveProfile} />;
  return <Lesson profile={profile} onEditLanguages={() => setEditingProfile(true)} />;
}

function Lesson({ profile, onEditLanguages }: { profile: LanguageProfile; onEditLanguages: () => void }) {
  const [stage, setStage] = useState<Stage>("vocabulary");
  const [wordIndex, setWordIndex] = useState(0);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [reviewDueIds, setReviewDueIds] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [mastery, setMastery] = useState(false);
  const [productionLanguage, setProductionLanguage] = useState<ProductionLanguage>("Spanish");
  const [spanishConfirmed, setSpanishConfirmed] = useState(false);
  const [accelerated, setAccelerated] = useState(false);
  const [deepGrammar, setDeepGrammar] = useState(false);
  const [learnerModel, setLearnerModel] = useState<LearnerModel>(emptyLearnerModel());
  const [sessionMode, setSessionMode] = useState<"new" | "review" | "strengthen">("new");

  useEffect(() => {
    const localCompleted = JSON.parse(window.localStorage.getItem("polyflow.completed-lessons.v1") || "[]") as string[];
    const savedModel = window.localStorage.getItem(learnerModelKey);
    const localModel = savedModel ? JSON.parse(savedModel) as LearnerModel : migrateCompletedLessons(localCompleted, curriculum);
    setLearnerModel(localModel);
    window.localStorage.setItem(learnerModelKey, JSON.stringify(localModel));
    setCompletedIds(localCompleted);
    const localSelection = selectNextLesson(curriculum, localModel, localCompleted);
    setLessonIndex(curriculum.findIndex((item) => item.id === localSelection.lesson.id));
    setSessionMode(localSelection.mode);
    fetch("/api/progress", { headers: learnerHeaders() })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { completedLessonIds?: string[]; reviewDueLessonIds?: string[] }) => {
        setReviewDueIds(data.reviewDueLessonIds || []);
        if (!data.completedLessonIds?.length) return;
        setCompletedIds(data.completedLessonIds);
        const serverSelection = selectNextLesson(curriculum, localModel, data.completedLessonIds);
        setLessonIndex(curriculum.findIndex((item) => item.id === serverSelection.lesson.id));
        setSessionMode(serverSelection.mode);
        window.localStorage.setItem("polyflow.completed-lessons.v1", JSON.stringify(data.completedLessonIds));
      })
      .catch(() => undefined);
  }, []);

  const lesson = curriculum[lessonIndex];
  const hasHistory = completedIds.length > 0;
  const activeLanguages = [profile.second, ...profile.additional]
    .filter((language): language is string => Boolean(language))
    .map((language) => language.trim().toLocaleLowerCase());
  const bridgeEnabled = activeLanguages.includes("vietnamese");
  const stageIndex = Math.max(0, stages.indexOf(stage));
  const progress = stage === "review" ? 100 : ((stageIndex + (stage === "vocabulary" ? wordIndex / lesson.vocabulary.length : 0)) / (stages.length - 1)) * 100;
  const currentWord = lesson.vocabulary[wordIndex];

  function advanceVocabulary() {
    if (wordIndex < lesson.vocabulary.length - 1) setWordIndex((value) => value + 1);
    else setStage("recall");
  }

  function checkLevel() {
    setAccelerated(true);
    setAnswer("");
    setFeedback("idle");
    setStage("mastery");
  }

  function checkRecall() {
    const passed = lesson.recall.accepted.map(normalizeAnswer).includes(normalizeAnswer(answer));
    setFeedback(passed ? "correct" : "gentle");
    if (!passed) setFailedAttempts((value) => value + 1);
    recordAttempt("recall", passed);
  }

  function checkMastery() {
    const production = productionLanguage === "Spanish" ? lesson.mastery : lesson.bridgeMastery;
    const passed = production.accepted.map(normalizeAnswer).includes(normalizeAnswer(answer));
    recordAttempt("mastery", passed, productionLanguage);
    if (passed && productionLanguage === "Spanish" && bridgeEnabled) {
      setSpanishConfirmed(true);
      setProductionLanguage("Vietnamese");
      setAnswer("");
      setFeedback("idle");
      setFailedAttempts(0);
      return;
    }
    if (!passed) setFailedAttempts((value) => value + 1);
    setFeedback(passed ? "correct" : "gentle");
    setMastery(passed);
  }

  function recordAttempt(kind: string, correct: boolean, language = "Spanish") {
    const learningLanguage = language === "Vietnamese" ? "Vietnamese" : "Spanish";
    setLearnerModel((current) => {
      const next = recordEvidence(
        current,
        lesson.objectiveId || lesson.id,
        learningLanguage,
        correct,
        kind === "supported-reconstruction",
      );
      window.localStorage.setItem(learnerModelKey, JSON.stringify(next));
      return next;
    });
    fetch("/api/progress", {
      method: "POST",
      headers: learnerHeaders(true),
      body: JSON.stringify({
        type: "attempt",
        lessonId: lesson.id,
        objectiveId: lesson.objectiveId || lesson.id,
        skill: lesson.skill,
        kind,
        language,
        correct,
        supported: kind === "supported-reconstruction",
      }),
      keepalive: true,
    }).catch(() => undefined);
  }

  function resetAnswer(nextStage?: Stage) {
    setAnswer("");
    setFeedback("idle");
    if (nextStage) {
      setFailedAttempts(0);
      setStage(nextStage);
    }
  }

  function learnFoundation() {
    setAccelerated(false);
    setWordIndex(0);
    resetAnswer("vocabulary");
  }

  function finishLesson() {
    const nextCompleted = completedIds.includes(lesson.id) ? completedIds : [...completedIds, lesson.id];
    setCompletedIds(nextCompleted);
    window.localStorage.setItem("polyflow.completed-lessons.v1", JSON.stringify(nextCompleted));
    setLearnerModel((current) => {
      const next = completeSession(current);
      window.localStorage.setItem(learnerModelKey, JSON.stringify(next));
      return next;
    });
    fetch("/api/progress", { method: "POST", headers: learnerHeaders(true), body: JSON.stringify({ type: "complete", lessonId: lesson.id, skill: lesson.skill, accelerated, profile }), keepalive: true }).catch(() => undefined);
    setStage("complete");
  }

  function resetLesson(nextIndex = lessonIndex) {
    setLessonIndex(nextIndex);
    setStage("vocabulary");
    setWordIndex(0);
    setAnswer("");
    setFeedback("idle");
    setFailedAttempts(0);
    setMastery(false);
    setProductionLanguage("Spanish");
    setSpanishConfirmed(false);
    setAccelerated(false);
    setDeepGrammar(false);
  }

  function continueLearning() {
    const selection = selectNextLesson(curriculum, learnerModel, completedIds);
    const nextIndex = curriculum.findIndex((item) => item.id === selection.lesson.id);
    setSessionMode(selection.mode);
    resetLesson(nextIndex);
  }

  function completeSupportedRecall() {
    recordAttempt("supported-reconstruction", true);
    setFailedAttempts(0);
    resetAnswer("sentence");
  }

  function completeSupportedMastery() {
    recordAttempt("supported-reconstruction", true, productionLanguage);
    setFailedAttempts(0);
    if (productionLanguage === "Spanish" && bridgeEnabled) {
      setSpanishConfirmed(true);
      setProductionLanguage("Vietnamese");
      setAnswer("");
      setFeedback("idle");
      return;
    }
    setFeedback("correct");
    setMastery(true);
  }

  return (
    <main className={`app-shell stage-${stage}`}>
      <header className="topline">
        <button className="wordmark" onClick={() => resetLesson()} aria-label="Restart lesson">PolyFlow</button>
        <div className="lesson-context">
          <span className="language-mark">ES</span>
          <span>{lesson.level} · {lesson.unitTitle} · {String(lesson.lesson).padStart(2, "0")} · {sessionMode === "new" ? "New" : sessionMode === "review" ? "Review" : "Strengthen"}</span>
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
            <p className="eyebrow">{lesson.title} · {wordIndex + 1} of {lesson.vocabulary.length}</p>
            <h1>{currentWord.word}</h1>
            <div className="language-stack compact-stack">
              <StackLine role="Native anchor" language={profile.native} value={currentWord.english} />
              {bridgeEnabled && <StackLine role="Supporting bridge" language="Vietnamese" value={currentWord.vietnamese} />}
            </div>
            <p className="contemplative-note">{currentWord.note}</p>
            <button className="primary-action" onClick={advanceVocabulary}>
              {wordIndex === lesson.vocabulary.length - 1 ? "Practice the foundation" : "Continue"}
              <span aria-hidden="true">→</span>
            </button>
            {wordIndex === 0 && <button className="text-action calibration-action" onClick={checkLevel}>Already familiar? Check my level</button>}
          </div>
        )}

        {stage === "recall" && (
          <div className="focus-content exercise-content">
            <p className="eyebrow">Active recall</p>
            <h1 className="exercise-title">{lesson.recall.prompt}</h1>
            <p className="instruction">{lesson.recall.instruction}</p>
            {failedAttempts < 3 ? (
              <>
                <AnswerField value={answer} onChange={(value) => { setAnswer(value); setFeedback("idle"); }} onEnter={checkRecall} placeholder="Type your answer" label="Your answer" />
                {feedback === "idle" && <button className="primary-action" disabled={!answer.trim()} onClick={checkRecall}>Check</button>}
              </>
            ) : (
              <RecoveryBuilder
                answer={lesson.recall.rescue.answer}
                bank={lesson.recall.rescue.bank}
                onComplete={completeSupportedRecall}
              />
            )}
            {feedback === "correct" && <Feedback kind="correct" title={lesson.recall.correct} detail="The answer is now connected to the structure beneath it." action="See the stack" onClick={() => resetAnswer("sentence")} />}
            {feedback === "gentle" && failedAttempts < 3 && <Feedback kind="gentle" title="Make the meaning explicit." detail={`${lesson.recall.hint} · ${failedAttempts} of 3 attempts`} action="Try again" onClick={() => resetAnswer()} />}
          </div>
        )}

        {stage === "sentence" && (
          <div className="focus-content sentence-content">
            <p className="eyebrow">One meaning · three structures</p>
            <h1 className="sentence">{lesson.sentence.target}</h1>
            <div className="language-stack sentence-stack">
              <StackLine role="Native anchor" language={profile.native} value={lesson.sentence.anchor} />
              {bridgeEnabled && <StackLine role="Supporting bridge" language="Vietnamese" value={lesson.sentence.bridge} />}
            </div>
            <p className="contemplative-note wide">{lesson.sentence.note}</p>
            <button className="primary-action" onClick={() => resetAnswer("grammar")}>See what changes <span aria-hidden="true">→</span></button>
          </div>
        )}

        {stage === "grammar" && (
          <div className="focus-content grammar-content">
            <p className="eyebrow">{deepGrammar ? "Grammar studio" : "The stack beneath the sentence"}</p>
            <h1 className="grammar-line"><span>{lesson.grammar.focus}</span></h1>
            {!deepGrammar ? (
              <>
                <div className={`grammar-grid language-grammar-grid ${bridgeEnabled ? "" : "two-layers"}`}>
                  <article><span className="grammar-language">Spanish · target</span><strong>{lesson.grammar.target.pattern}</strong><p>{lesson.grammar.target.explanation}</p></article>
                  <article><span className="grammar-language">{profile.native} · anchor</span><strong>{lesson.grammar.anchor.pattern}</strong><p>{lesson.grammar.anchor.explanation}</p></article>
                  {bridgeEnabled && <article><span className="grammar-language">Vietnamese · supporting bridge</span><strong>{lesson.grammar.bridge.pattern}</strong><p>{lesson.grammar.bridge.explanation}</p></article>}
                </div>
                <p className="insight">{lesson.grammar.insight}</p>
                <button className="text-action grammar-depth-action" onClick={() => setDeepGrammar(true)}>Go deeper into the grammar</button>
                <button className="primary-action" onClick={() => setStage("transform")}>Build the Spanish <span aria-hidden="true">→</span></button>
              </>
            ) : (
              <>
                <div className="deep-grammar-grid">
                  {lesson.grammar.deep.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, "0")} · {item.title}</span><strong>{item.principle}</strong><p>{item.explanation}</p></article>)}
                </div>
                <p className="deep-grammar-summary">{lesson.grammar.summary}</p>
                <button className="text-action grammar-depth-action" onClick={() => setDeepGrammar(false)}>Return to the lesson view</button>
                <button className="primary-action" onClick={() => { setDeepGrammar(false); setStage("transform"); }}>Build the Spanish <span aria-hidden="true">→</span></button>
              </>
            )}
          </div>
        )}

        {stage === "transform" && <TransformExercise lesson={lesson} onComplete={() => resetAnswer("mastery")} />}

        {stage === "mastery" && (
          <div className="focus-content exercise-content">
            <p className="eyebrow">{accelerated ? "Fluency check" : "Foundation check"} · {productionLanguage}</p>
            <h1 className="exercise-title">{productionLanguage === "Spanish" ? lesson.mastery.prompt : lesson.bridgeMastery.prompt}</h1>
            <p className="instruction">{productionLanguage === "Spanish" ? lesson.mastery.instruction : lesson.bridgeMastery.instruction}</p>
            {bridgeEnabled && <p className="production-path"><span className={productionLanguage === "Spanish" ? "active" : "complete"}>English meaning</span><i>→</i><span className={productionLanguage === "Spanish" ? "active" : "complete"}>Spanish</span><i>→</i><span className={productionLanguage === "Vietnamese" ? "active" : ""}>Vietnamese</span></p>}
            {spanishConfirmed && productionLanguage === "Vietnamese" && <p className="production-confirmation">Spanish secured · {lesson.mastery.answer}</p>}
            {failedAttempts < 3 ? (
              <>
                <AnswerField value={answer} onChange={(value) => { setAnswer(value); setFeedback("idle"); }} onEnter={checkMastery} placeholder={productionLanguage === "Spanish" ? "Escribe en español" : "Viết bằng tiếng Việt"} label={`${productionLanguage} answer`} />
                {feedback === "idle" && <button className="primary-action" disabled={!answer.trim()} onClick={checkMastery}>Check understanding</button>}
              </>
            ) : (
              <RecoveryBuilder
                answer={productionLanguage === "Spanish" ? lesson.mastery.answer : lesson.bridgeMastery.answer}
                onComplete={completeSupportedMastery}
              />
            )}
            {feedback === "gentle" && failedAttempts < 3 && accelerated && productionLanguage === "Spanish" && <Feedback kind="gentle" title="This foundation is worth making explicit." detail={lesson.mastery.hint} action="Learn the foundation" onClick={learnFoundation} />}
            {feedback === "gentle" && failedAttempts < 3 && !(accelerated && productionLanguage === "Spanish") && <Feedback kind="gentle" title={productionLanguage === "Spanish" ? lesson.mastery.hint : lesson.bridgeMastery.hint} detail={`${failedAttempts} of 3 attempts · Try once more from memory.`} action="Try again" onClick={() => resetAnswer()} />}
            {feedback === "correct" && (productionLanguage === "Vietnamese" || !bridgeEnabled) && <Feedback kind="correct" title={productionLanguage === "Vietnamese" ? lesson.bridgeMastery.answer : lesson.mastery.answer} detail={accelerated ? "PolyFlow will move quickly until the work reveals your actual edge." : "You produced the meaning across every active learning language."} action="Complete lesson" onClick={finishLesson} />}
          </div>
        )}

        {stage === "complete" && (
          <div className="focus-content completion-content">
            <div className="completion-mark" aria-hidden="true">✓</div>
            <p className="eyebrow">Lesson {lesson.lesson} mapped</p>
            <h1>{accelerated ? "This is already familiar." : lesson.title}</h1>
            <p className="completion-copy">{accelerated ? "PolyFlow recorded this foundation as familiar and will keep raising the level." : lesson.completion}</p>
            <div className="learning-signal">
              <span>{accelerated ? "Advance quickly" : "Becoming stable"}</span>
              <strong>Spanish · {lesson.skill}</strong>
              <p>{lesson.vocabulary.map((item) => item.word).join(" · ")}</p>
            </div>
            <button className="primary-action" onClick={continueLearning}>Continue learning <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={() => setStage("review")}>Review the stack</button>
            <button className="text-action edit-languages-action" onClick={onEditLanguages}>Edit language stack</button>
          </div>
        )}

        {stage === "review" && (
          <div className="focus-content review-content">
            <button className="back-action" onClick={() => setStage(hasHistory ? "complete" : "vocabulary")} aria-label="Back">←</button>
            <p className="eyebrow">Quiet review</p>
            <h1>Your Spanish foundations</h1>
            <div className="review-list">
              {curriculum.map((item, index) => (
                <div className="review-row stacked-review-row" key={item.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item.title}</strong>
                  <p>{item.level} · {item.unitTitle} · {item.skill}</p>
                  <em>{reviewDueIds.includes(item.id)
                    ? "Due"
                    : completedIds.includes(item.id)
                      ? masteryState(learnerModel.evidence[evidenceKey(item.objectiveId || item.id, "Spanish")])
                      : index === lessonIndex ? "Next" : "Waiting"}</em>
                </div>
              ))}
            </div>
            <button className="primary-action" onClick={() => resetLesson()}>Return to lesson</button>
          </div>
        )}
      </section>

      <footer className="lesson-footer">
        <span>{stage === "complete" ? `${completedIds.length} of ${curriculum.length} ${lesson.level} lessons mapped` : `Spanish target · ${profile.native} anchor · ${bridgeEnabled ? "Vietnamese active practice" : "native anchor"}`}</span>
        <span>{mastery ? "Level signal recorded" : "Text-first · No streaks, no scores"}</span>
      </footer>
    </main>
  );
}

function LanguageSetup({ initialProfile, onComplete }: { initialProfile?: LanguageProfile; onComplete: (profile: LanguageProfile) => void }) {
  const [step, setStep] = useState(0);
  const [native, setNative] = useState(initialProfile?.native ?? "English");
  const [second, setSecond] = useState<string | null>(initialProfile?.second ?? "Vietnamese");
  const [secondConfidence, setSecondConfidence] = useState<Confidence>(initialProfile?.secondConfidence ?? "developing");
  const [additional, setAdditional] = useState<string[]>(initialProfile?.additional ?? ["Spanish"]);

  const target = additional[additional.length - 1] || second || "a new language";
  const totalSteps = 4;

  return (
    <main className="app-shell setup-shell">
      <header className="topline setup-topline">
        <span className="wordmark static-wordmark">PolyFlow</span>
        <div className="lesson-context"><span>Your language stack</span></div>
        <span className="setup-step-count">{step + 1} of {totalSteps}</span>
      </header>
      <div className="progress-track"><span style={{ width: `${((step + 1) / totalSteps) * 100}%` }} /></div>

      <section className="lesson-stage setup-stage">
        {step === 0 && (
          <SetupFrame eyebrow="Your native anchor" title="What language shaped your first thoughts?" description="PolyFlow uses your native language to make unfamiliar grammar immediately intelligible.">
            <LanguagePicker selected={[native]} excluded={[]} onSelect={(language) => setNative(language)} />
            <button className="primary-action" onClick={() => { if (second === native) setSecond(null); setStep(1); }}>Continue <span aria-hidden="true">→</span></button>
          </SetupFrame>
        )}

        {step === 1 && (
          <SetupFrame eyebrow="Another language you know" title="What language became yours next?" description="It does not need to be fluent. PolyFlow will use it only when it makes the new language clearer.">
            <LanguagePicker selected={second ? [second] : []} excluded={[native]} onSelect={(language) => setSecond(language)} />
            {second && <ConfidencePicker value={secondConfidence} onChange={setSecondConfidence} />}
            <button className="primary-action" onClick={() => setStep(2)}>Continue <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={() => { setSecond(null); setStep(2); }}>I do not have another language yet</button>
          </SetupFrame>
        )}

        {step === 2 && (
          <SetupFrame eyebrow="The rest of your language life" title="Which other languages are part of you?" description="Add as many as you need, from stronger languages toward the ones still growing.">
            <LanguagePicker
              selected={additional}
              excluded={[native, ...(second ? [second] : [])]}
              multiple
              onSelect={(language) => setAdditional((current) => current.includes(language) ? current.filter((item) => item !== language) : [...current, language])}
            />
            <button className="primary-action" onClick={() => setStep(3)}>Shape my stack <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={() => setStep(3)}>That is enough for now</button>
          </SetupFrame>
        )}

        {step === 3 && (
          <div className="focus-content setup-content ready-content">
            <p className="eyebrow">Your learning architecture</p>
            <h1>Your languages can help one another.</h1>
            <div className="profile-stack">
              <ProfileLanguage index="01" role="Native anchor" language={native} />
              {second && <ProfileLanguage index="02" role="Supporting bridge" language={second} detail={confidenceLabels[secondConfidence]} />}
              {additional.map((language, index) => <ProfileLanguage key={language} index={String(index + (second ? 3 : 2)).padStart(2, "0")} role={index === additional.length - 1 ? "Growing edge" : "Additional bridge"} language={language} />)}
            </div>
            <p className="setup-description ready-description">PolyFlow will begin with essential {target} vocabulary and place it into daily conversation. Every explanation stays grounded in {native}; other languages appear only when they provide a useful bridge.</p>
            <button className="primary-action" onClick={() => onComplete({ native, second, secondConfidence: second ? secondConfidence : null, additional })}>{initialProfile ? "Save language stack" : "Begin with foundations"} <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={() => setStep(0)}>Edit my languages</button>
          </div>
        )}
      </section>

      <footer className="lesson-footer"><span>Language begins from what you already know</span><span>No placement paperwork · PolyFlow learns as you learn</span></footer>
    </main>
  );
}

function SetupFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <div className="focus-content setup-content"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="setup-description">{description}</p>{children}</div>;
}

const confidenceLabels: Record<Confidence, string> = { developing: "Developing", comfortable: "Comfortable", strong: "Strong" };

function ConfidencePicker({ value, onChange }: { value: Confidence; onChange: (confidence: Confidence) => void }) {
  return (
    <div className="confidence-field">
      <span>How available does this language feel?</span>
      <div className="confidence-options" role="radiogroup" aria-label="Language confidence">
        {(Object.keys(confidenceLabels) as Confidence[]).map((confidence) => <button key={confidence} className={value === confidence ? "selected" : ""} role="radio" aria-checked={value === confidence} onClick={() => onChange(confidence)}>{confidenceLabels[confidence]}</button>)}
      </div>
    </div>
  );
}

function LanguagePicker({ selected, excluded, multiple = false, onSelect }: { selected: string[]; excluded: string[]; multiple?: boolean; onSelect: (language: string) => void }) {
  const [query, setQuery] = useState("");
  const choices = commonLanguages.filter((language) => !excluded.includes(language) && language.toLowerCase().includes(query.trim().toLowerCase())).slice(0, query ? 12 : 9);
  const customLanguage = query.trim() && !commonLanguages.some((language) => language.toLowerCase() === query.trim().toLowerCase()) ? query.trim() : null;

  return (
    <div className="language-picker">
      <input className="language-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search or type a language" aria-label="Search languages" />
      <div className="language-options" role={multiple ? "group" : "radiogroup"} aria-label="Languages">
        {choices.map((language) => <button key={language} className={selected.includes(language) ? "selected" : ""} onClick={() => onSelect(language)} role={multiple ? undefined : "radio"} aria-checked={multiple ? undefined : selected.includes(language)}><span>{language}</span>{selected.includes(language) && <em>{multiple ? "Added" : "Selected"}</em>}</button>)}
        {customLanguage && <button className={selected.includes(customLanguage) ? "selected" : ""} onClick={() => { onSelect(customLanguage); setQuery(""); }}><span>Add “{customLanguage}”</span><em>Custom</em></button>}
      </div>
      {multiple && selected.length > 0 && <div className="selected-languages" aria-label="Selected additional languages">{selected.map((language) => <button key={language} onClick={() => onSelect(language)}>{language}<span aria-hidden="true">×</span></button>)}</div>}
    </div>
  );
}

function ProfileLanguage({ index, role, language, detail }: { index: string; role: string; language: string; detail?: string }) {
  return <div className="profile-language"><span>{index}</span><div><small>{role}{detail && <em> · {detail}</em>}</small><strong>{language}</strong></div></div>;
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

function RecoveryBuilder({ answer, bank, onComplete }: { answer: string; bank?: string[]; onComplete: () => void }) {
  const target = answer.replace(/[¿?.,!¡]/g, "").split(/\s+/).filter(Boolean);
  const options = (bank || target).map((word, index) => ({ id: `${word}-${index}`, word }));
  const [chosen, setChosen] = useState<typeof options>([]);
  const [checked, setChecked] = useState(false);
  const isComplete = chosen.length === target.length;
  const isCorrect = isComplete && normalizeAnswer(chosen.map((item) => item.word).join(" ")) === normalizeAnswer(target.join(" "));

  function choose(option: (typeof options)[number]) {
    if (!chosen.some((item) => item.id === option.id)) {
      setChosen((current) => [...current, option]);
      setChecked(false);
    }
  }

  return (
    <div className="recovery-builder">
      <p className="recovery-intro"><strong>Build it from what you now know.</strong><span>Choose the words in the correct order.</span></p>
      <div className="sentence-builder" aria-label="Your reconstructed answer">
        {chosen.length ? chosen.map((item) => (
          <button key={item.id} onClick={() => { setChosen((current) => current.filter((chosenItem) => chosenItem.id !== item.id)); setChecked(false); }}>{item.word}</button>
        )) : <span>Select the first word</span>}
      </div>
      <div className="word-bank" aria-label="Available words">
        {options.map((option) => <button key={option.id} disabled={chosen.some((item) => item.id === option.id)} onClick={() => choose(option)}>{option.word}</button>)}
      </div>
      {!checked && <button className="primary-action" disabled={!isComplete} onClick={() => setChecked(true)}>Check reconstruction</button>}
      {checked && isCorrect && <Feedback kind="correct" title="You rebuilt the meaning." detail="This will return in review so it can become available without support." action="Continue" onClick={onComplete} />}
      {checked && !isCorrect && <Feedback kind="gentle" title="The pieces are here." detail="Clear the line and try a different order." action="Rebuild" onClick={() => { setChosen([]); setChecked(false); }} />}
    </div>
  );
}

function TransformExercise({ lesson, onComplete }: { lesson: LessonDefinition; onComplete: () => void }) {
  const words = lesson.transform.words;
  const [chosen, setChosen] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);

  function choose(word: string) {
    if (!chosen.includes(word)) { setChosen([...chosen, word]); setChecked(false); }
  }

  return (
    <div className="focus-content transform-content">
      <p className="eyebrow">Build the target</p>
      <h1 className="exercise-title">{lesson.transform.prompt}</h1>
      <p className="bridge-reminder">{lesson.transform.bridgeReminder}</p>
      <div className="sentence-builder" aria-label="Your sentence">
        {chosen.length ? chosen.map((word) => <button key={word} onClick={() => { setChosen(chosen.filter((item) => item !== word)); setChecked(false); }}>{word}</button>) : <span>Build the natural Spanish</span>}
      </div>
      <div className="word-bank">
        {lesson.transform.bank.map((word) => <button key={word} disabled={chosen.includes(word)} onClick={() => choose(word)}>{word}</button>)}
      </div>
      {!checked && <button className="primary-action" disabled={chosen.length !== words.length} onClick={() => setChecked(true)}>Check structure</button>}
      {checked && chosen.join(" ") === words.join(" ") && <Feedback kind="correct" title="Natural and complete." detail="The structure now carries the intended meaning." action="Final check" onClick={onComplete} />}
      {checked && chosen.join(" ") !== words.join(" ") && <Feedback kind="gentle" title={lesson.transform.hint} detail={`Build toward: ${words.join(" ")}`} action="Rebuild" onClick={() => { setChosen([]); setChecked(false); }} />}
    </div>
  );
}
