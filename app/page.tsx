"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { curriculum, LessonDefinition, normalizeAnswer, sentenceAnatomyForLesson } from "./curriculum";
import { InteractiveSentence } from "./sentence-anatomy";
import { DailyLesson } from "./daily-lesson";
import { UniversalXRay } from "./universal-xray";
import { FirstLaunchIntro } from "./first-launch-intro";
import ListenButton from "./listen-button";
import { speechLanguage } from "./speech";
import type { FoundationLanguage } from "./multilingual-foundation";
import "./multilingual-preview/preview.css";
import { createReverseRecallExercises, type LessonTranslationExercise } from "./lesson-tools";
import { loadCurriculum } from "./curriculum-cache";
import { courseMap, outsidePracticeFor, plannedCourseLessonCount } from "./course-map";
import {
  completeSession, emptyLearnerModel, languageMastery, LearnerModel, RetrievalEdge,
  migrateCompletedLessons, normalizeLearnerModel, recordEvidence, selectNextLesson,
} from "./learning-engine";

type Stage = "vocabulary" | "recall" | "sentence" | "grammar" | "transform" | "mastery" | "reverse" | "complete" | "review";
type FeedbackState = "idle" | "correct" | "gentle";
type Confidence = "developing" | "comfortable" | "strong";
type ProductionLanguage = "Spanish" | "Vietnamese";
type LanguageProfile = { native: string; second: string | null; secondConfidence: Confidence | null; additional: string[] };

const commonLanguages = [
  "English", "Spanish", "Vietnamese", "French", "Portuguese", "German",
  "Italian", "Mandarin Chinese", "Japanese", "Korean", "Arabic", "Hindi", "Russian",
];

const stages: Stage[] = ["vocabulary", "recall", "sentence", "grammar", "transform", "mastery", "reverse", "complete"];
const learnerIdKey = "linguathread.learner-id.v1";
const learnerModelKey = "linguathread.learner-model.v1";

const jsonHeaders = { "content-type": "application/json" };
const ScriptCourseView = dynamic(() => import("./writing-system/view"), { loading: () => <p role="status">Opening writing foundations…</p> });

export default function Home() {
  const [profile, setProfile] = useState<LanguageProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [launchState, setLaunchState] = useState<"checking" | "intro" | "app">("checking");

  useEffect(() => {
    const saved = window.localStorage.getItem("linguathread.language-profile.v1");
    const legacyLearnerId = window.localStorage.getItem(learnerIdKey);
    let localProfile: LanguageProfile | null = null;
    if (saved) try {
      const parsed = JSON.parse(saved) as Partial<LanguageProfile>;
      if (parsed.native && Array.isArray(parsed.additional)) localProfile = { native: parsed.native, second: parsed.second || null, secondConfidence: parsed.second ? (parsed.secondConfidence || "developing") : null, additional: parsed.additional };
    } catch { window.localStorage.removeItem("linguathread.language-profile.v1"); }

    fetch("/api/session", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ legacyLearnerId }) })
      .then(async (response) => {
        const session = response.ok ? await response.json() as { legacyClaimed?: boolean } : {};
        if (session.legacyClaimed) window.localStorage.removeItem(learnerIdKey);
        const profileResponse = await fetch("/api/profile");
        const data = profileResponse.ok ? await profileResponse.json() as { profile?: LanguageProfile | null } : {};
        const nextProfile = data.profile || localProfile;
        setProfile(nextProfile);
        setLaunchState("intro");
      })
      .catch(() => {
        setProfile(localProfile);
        setLaunchState("intro");
      })
      .finally(() => setLoaded(true));
  }, []);

  function saveProfile(nextProfile: LanguageProfile) {
    window.localStorage.setItem("linguathread.language-profile.v1", JSON.stringify(nextProfile));
    fetch("/api/profile", { method: "PUT", headers: jsonHeaders, body: JSON.stringify(nextProfile), keepalive: true }).catch(() => undefined);
    setProfile(nextProfile);
    setEditingProfile(false);
  }

  if (!loaded || launchState === "checking") return <main className="app-shell launch-loading" aria-label="Loading LinguaThread" />;
  if (launchState === "intro") return <FirstLaunchIntro onBegin={() => setLaunchState("app")} />;
  if (!profile) return <LanguageSetup onComplete={saveProfile} />;
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
  const [reverseIndex, setReverseIndex] = useState(0);
  const [accelerated, setAccelerated] = useState(false);
  const [deepGrammar, setDeepGrammar] = useState(false);
  const [learnerModel, setLearnerModel] = useState<LearnerModel>(emptyLearnerModel());
  const [sessionMode, setSessionMode] = useState<"new" | "review" | "strengthen">("new");
  const [course, setCourse] = useState<LessonDefinition[]>(curriculum);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [xrayOpen, setXrayOpen] = useState(false);
  const [scriptLanguage, setScriptLanguage] = useState<FoundationLanguage | null>(null);
  const xrayTriggerRef = useRef<HTMLButtonElement>(null);
  const attemptStartedAtRef = useRef(Date.now());

  useEffect(() => {
    attemptStartedAtRef.current = Date.now();
  }, [stage, wordIndex, productionLanguage, reverseIndex, dailyOpen, scriptLanguage]);

  useEffect(() => {
    let localCompleted: string[] = [];
    try {
      const stored = JSON.parse(window.localStorage.getItem("linguathread.completed-lessons.v1") || "[]");
      localCompleted = Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : [];
    } catch {
      window.localStorage.removeItem("linguathread.completed-lessons.v1");
    }
    const savedModel = window.localStorage.getItem(learnerModelKey);
    Promise.all([
      loadCurriculum(curriculum).then((result) => result.lessons),
      fetch("/api/progress")
        .then((response) => response.ok ? response.json() : Promise.reject())
        .catch(() => ({ completedLessonIds: [], reviewDueLessonIds: [] })),
    ]).then(([loadedCourse, data]: [
      LessonDefinition[],
      { completedLessonIds?: string[]; reviewDueLessonIds?: string[] },
    ]) => {
        const completed = data.completedLessonIds?.length ? data.completedLessonIds : localCompleted;
        let localModel = migrateCompletedLessons(completed, loadedCourse);
        if (savedModel) {
          try {
            localModel = normalizeLearnerModel(JSON.parse(savedModel));
          } catch {
            window.localStorage.removeItem(learnerModelKey);
          }
        }
        setCourse(loadedCourse);
        setLearnerModel(localModel);
        window.localStorage.setItem(learnerModelKey, JSON.stringify(localModel));
        setCompletedIds(completed);
        setReviewDueIds(data.reviewDueLessonIds || []);
        const selection = selectNextLesson(loadedCourse, localModel, completed);
        setLessonIndex(Math.max(0, loadedCourse.findIndex((item) => item.id === selection.lesson.id)));
        setSessionMode(selection.mode);
        if (data.completedLessonIds?.length) {
          window.localStorage.setItem("linguathread.completed-lessons.v1", JSON.stringify(data.completedLessonIds));
        }
      })
      .catch(() => undefined);
  }, []);

  const lesson = course[lessonIndex] || course[0];
  const hasHistory = completedIds.length > 0;
  const activeLanguages = [profile.second, ...profile.additional]
    .filter((language): language is string => Boolean(language))
    .map((language) => language.trim().toLocaleLowerCase());
  const bridgeEnabled = activeLanguages.includes("vietnamese");
  const stageIndex = Math.max(0, stages.indexOf(stage));
  const progress = stage === "review" ? 100 : ((stageIndex + (stage === "vocabulary" ? wordIndex / lesson.vocabulary.length : 0)) / (stages.length - 1)) * 100;
  const currentWord = lesson.vocabulary[wordIndex];
  const outsidePractice = outsidePracticeFor(lesson.level, lesson.unit);
  const reverseExercises = createReverseRecallExercises(lesson, bridgeEnabled);
  const literacyLanguages = [...new Set([profile.second, ...profile.additional])]
    .filter((language): language is string => Boolean(language) && language !== profile.native)
    .map((language) => ({ name: language, id: speechLanguage(language) }))
    .filter((item): item is { name: string; id: FoundationLanguage } => item.id !== null);

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
    recordAttempt("recall", passed, "Spanish", lesson, {
      fromLanguage: "Spanish", toLanguage: "English", fromModality: "written", toModality: "meaning", retrievalType: "recognition",
    }, passed ? undefined : "lexical");
  }

  function checkMastery() {
    const production = productionLanguage === "Spanish" ? lesson.mastery : lesson.bridgeMastery;
    const passed = production.accepted.map(normalizeAnswer).includes(normalizeAnswer(answer));
    recordAttempt("mastery", passed, productionLanguage, lesson, {
      fromLanguage: "English", toLanguage: productionLanguage, fromModality: "meaning", toModality: "written", retrievalType: "production",
    }, passed ? undefined : "production");
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

  function recordAttempt(
    kind: string,
    correct: boolean,
    language = "Spanish",
    evidenceLesson = lesson,
    edge?: RetrievalEdge,
    errorType?: "lexical" | "structural" | "script" | "listening" | "production" | "unknown",
  ) {
    const learningLanguage = language;
    const latencyMs = Math.max(0, Date.now() - attemptStartedAtRef.current);
    attemptStartedAtRef.current = Date.now();
    setLearnerModel((current) => {
      const next = recordEvidence(
        current,
        evidenceLesson.objectiveId || evidenceLesson.id,
        learningLanguage,
        correct,
        kind === "supported-reconstruction" || kind === "transform-model",
        new Date(),
        edge,
        latencyMs,
        errorType,
      );
      window.localStorage.setItem(learnerModelKey, JSON.stringify(next));
      return next;
    });
    fetch("/api/progress", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        type: "attempt",
        lessonId: evidenceLesson.id,
        objectiveId: evidenceLesson.objectiveId || evidenceLesson.id,
        skill: evidenceLesson.skill,
        kind,
        language,
        correct,
        supported: kind === "supported-reconstruction" || kind === "transform-model",
        edgeKey: edge ? [edge.fromLanguage, edge.toLanguage, edge.fromModality, edge.toModality, edge.retrievalType].join(":") : undefined,
        fromLanguage: edge?.fromLanguage,
        toLanguage: edge?.toLanguage,
        fromModality: edge?.fromModality,
        toModality: edge?.toModality,
        retrievalType: edge?.retrievalType,
        errorType,
        latencyMs,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }

  function recordScriptEvidence(unitId: string, mode: import("./script-literacy").ScriptTaskMode, correct: boolean, supported: boolean) {
    const languageName = literacyLanguages.find((item) => item.id === scriptLanguage)?.name || scriptLanguage || "script";
    const modalities: Record<string, [import("./learning-engine").RetrievalModality, import("./learning-engine").RetrievalModality]> = {
      "visual-recognition": ["script", "meaning"], "sound-to-form": ["sound", "script"], "form-to-sound": ["script", "sound"],
      "component-assembly": ["component", "script"], "keyboard-reconstruction": ["meaning", "input"], "device-dictation": ["sound", "input"],
      "meaning-retrieval": ["script", "meaning"], "unseen-transfer": ["structure", "script"],
    };
    const [fromModality, toModality] = modalities[mode];
    const retrievalType = mode === "unseen-transfer" ? "transfer" : mode.includes("reconstruction") || mode === "component-assembly" ? "reconstruction" : "recognition";
    const edge: RetrievalEdge = { fromLanguage: languageName, toLanguage: languageName, fromModality, toModality, retrievalType };
    setLearnerModel((current) => {
      const next = recordEvidence(current, unitId, languageName, correct, supported, new Date(), edge, Math.max(0, Date.now() - attemptStartedAtRef.current), correct ? undefined : mode === "sound-to-form" ? "listening" : mode === "component-assembly" ? "composition" : mode.includes("dictation") || mode.includes("keyboard") ? "input" : "script");
      window.localStorage.setItem(learnerModelKey, JSON.stringify(next));
      return next;
    });
    fetch("/api/progress", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ type: "attempt", lessonId: unitId, objectiveId: unitId, skill: "writing-system", kind: mode, language: languageName, correct, supported, edgeKey: [languageName, languageName, fromModality, toModality, retrievalType].join(":"), fromLanguage: languageName, toLanguage: languageName, fromModality, toModality, retrievalType, errorType: correct ? undefined : "script" }), keepalive: true }).catch(() => undefined);
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
    window.localStorage.setItem("linguathread.completed-lessons.v1", JSON.stringify(nextCompleted));
    setLearnerModel((current) => {
      const next = completeSession(current);
      window.localStorage.setItem(learnerModelKey, JSON.stringify(next));
      return next;
    });
    fetch("/api/progress", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ type: "complete", lessonId: lesson.id, skill: lesson.skill, accelerated, profile }), keepalive: true }).catch(() => undefined);
    setStage("complete");
  }

  function skipLesson(language: string) {
    recordAttempt("skipped", false, language);
    finishLesson();
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
    setReverseIndex(0);
    setAccelerated(false);
    setDeepGrammar(false);
  }

  function continueLearning() {
    const selection = selectNextLesson(course, learnerModel, completedIds);
    const nextIndex = course.findIndex((item) => item.id === selection.lesson.id);
    setSessionMode(selection.mode);
    resetLesson(nextIndex);
  }

  function completeSupportedRecall() {
    recordAttempt("supported-reconstruction", true, "Spanish", lesson, {
      fromLanguage: "English", toLanguage: "Spanish", fromModality: "meaning", toModality: "written", retrievalType: "reconstruction",
    });
    setFailedAttempts(0);
    resetAnswer("sentence");
  }

  function completeSupportedMastery() {
    recordAttempt("supported-reconstruction", true, productionLanguage, lesson, {
      fromLanguage: "English", toLanguage: productionLanguage, fromModality: "meaning", toModality: "written", retrievalType: "reconstruction",
    });
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

  function closeXRay() {
    setXrayOpen(false);
    requestAnimationFrame(() => xrayTriggerRef.current?.focus());
  }

  return (
    <main className={`app-shell stage-${stage}`}>
      <header className="topline">
        <button className="wordmark" onClick={() => resetLesson()} aria-label="Restart lesson">LinguaThread</button>
        <div className="lesson-context">
          <span className="language-mark">ES</span>
          <span>{lesson.level} · {lesson.unitTitle} · {String(lesson.lesson).padStart(2, "0")} · {sessionMode === "new" ? "New" : sessionMode === "review" ? "Review" : "Strengthen"}</span>
        </div>
        <div className="header-actions">
          <button className="quiet-action today-action" onClick={() => setDailyOpen(true)}>Today’s Lesson</button>
          {stage !== "review" && <button className="quiet-action" onClick={() => setStage("review")}>Language Path</button>}
          {literacyLanguages[0] && <button className="quiet-action writing-action" onClick={() => setScriptLanguage(literacyLanguages[0].id)}>Writing System</button>}
          <button ref={xrayTriggerRef} className="quiet-action xray-action" onClick={() => setXrayOpen(true)}>Expression X-Ray</button>
        </div>
      </header>

      {stage !== "complete" && stage !== "review" && (
        <div className="progress-track" aria-label={`Lesson ${Math.round(progress)}% complete`}>
          <span style={{ width: `${Math.max(4, progress)}%` }} />
        </div>
      )}

      <section className="lesson-stage" aria-live="polite">
        {scriptLanguage ? <div className="focus-content"><ScriptCourseView key={scriptLanguage} language={scriptLanguage} languages={literacyLanguages} currentLesson={lesson} onLanguage={setScriptLanguage} onClose={() => setScriptLanguage(null)} onEvidence={recordScriptEvidence} /></div> : dailyOpen ? <DailyLesson course={course} current={lesson} dueIds={reviewDueIds} completedIds={completedIds} onClose={() => setDailyOpen(false)} onEvidence={(correct, language, lessonId, exercise) => recordAttempt("daily-translation", correct, language, course.find((item) => item.id === lessonId) || lesson, {
          fromLanguage: exercise.from, toLanguage: exercise.to, fromModality: "written", toModality: exercise.to === "English" ? "meaning" : "written", retrievalType: exercise.phase === "variation" ? "transfer" : exercise.phase === "review" ? "reverse" : "production",
        }, correct ? undefined : exercise.scope === "word" ? "lexical" : "structural")} /> : <>
        {stage === "vocabulary" && (
          <div className="focus-content vocab-content" key={currentWord.word}>
            <p className="eyebrow">{lesson.title} · {wordIndex + 1} of {lesson.vocabulary.length}</p>
            <h1>{currentWord.word}</h1>
            <ListenButton text={currentWord.word} language="es" />
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
                language="English"
                onComplete={completeSupportedRecall}
                onSkip={() => skipLesson("English")}
              />
            )}
            {feedback === "correct" && <Feedback kind="correct" title={lesson.recall.correct} detail="The answer is now connected to the structure beneath it." action="See the stack" onClick={() => resetAnswer("sentence")} />}
            {feedback === "gentle" && failedAttempts < 3 && <Feedback kind="gentle" title="Make the meaning explicit." detail={`${lesson.recall.hint} · ${failedAttempts} of 3 attempts`} action="Try again" onClick={() => resetAnswer()} />}
          </div>
        )}

        {stage === "sentence" && (
          <InteractiveSentence model={sentenceAnatomyForLesson(lesson)} lesson={lesson} showBridge={bridgeEnabled} onContinue={() => resetAnswer("grammar")} />
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

        {stage === "transform" && <TransformExercise lesson={lesson} onAttempt={(correct, supported, language) => recordAttempt(supported ? "transform-model" : "transform", correct, language, lesson, {
          fromLanguage: "English", toLanguage: language, fromModality: "meaning", toModality: "written", retrievalType: "reconstruction",
        }, correct ? undefined : "structural")} onComplete={() => resetAnswer("mastery")} onSkip={() => skipLesson(lesson.transform.language)} />}

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
                language={productionLanguage}
                onComplete={completeSupportedMastery}
                onSkip={() => skipLesson(productionLanguage)}
              />
            )}
            {feedback === "gentle" && failedAttempts < 3 && accelerated && productionLanguage === "Spanish" && <Feedback kind="gentle" title="This foundation is worth making explicit." detail={lesson.mastery.hint} action="Learn the foundation" onClick={learnFoundation} />}
            {feedback === "gentle" && failedAttempts < 3 && !(accelerated && productionLanguage === "Spanish") && <Feedback kind="gentle" title={productionLanguage === "Spanish" ? lesson.mastery.hint : lesson.bridgeMastery.hint} detail={`${failedAttempts} of 3 attempts · Try once more from memory.`} action="Try again" onClick={() => resetAnswer()} />}
            {feedback === "correct" && (productionLanguage === "Vietnamese" || !bridgeEnabled) && <Feedback kind="correct" title={productionLanguage === "Vietnamese" ? lesson.bridgeMastery.answer : lesson.mastery.answer} detail="Now recover the shared meaning from each language." action="Reverse the direction" onClick={() => resetAnswer("reverse")} />}
          </div>
        )}

        {stage === "reverse" && <ReverseRecall
          key={reverseExercises[reverseIndex]?.id}
          exercise={reverseExercises[reverseIndex]}
          position={reverseIndex + 1}
          total={reverseExercises.length}
          onAttempt={(correct, language) => recordAttempt("reverse-recall", correct, language, lesson, {
            fromLanguage: reverseExercises[reverseIndex].from,
            toLanguage: reverseExercises[reverseIndex].to,
            fromModality: "written", toModality: "meaning", retrievalType: "reverse",
          }, correct ? undefined : "structural")}
          onComplete={() => reverseIndex < reverseExercises.length - 1 ? setReverseIndex((value) => value + 1) : finishLesson()}
          onSkip={() => {
            recordAttempt("skipped-reverse", false, reverseExercises[reverseIndex].evidenceLanguage);
            if (reverseIndex < reverseExercises.length - 1) setReverseIndex((value) => value + 1);
            else finishLesson();
          }}
        />}

        {stage === "complete" && (
          <div className="focus-content completion-content">
            <div className="completion-mark" aria-hidden="true">✓</div>
            <p className="eyebrow">Lesson {lesson.lesson} mapped</p>
            <h1>{accelerated ? "This is already familiar." : lesson.title}</h1>
            <p className="completion-copy">{accelerated ? "LinguaThread recorded this foundation as familiar and will keep raising the level." : lesson.completion}</p>
            <div className="learning-signal">
              <span>{accelerated ? "Advance quickly" : "Becoming stable"}</span>
              <strong>Spanish · {lesson.skill}</strong>
              <p>{lesson.vocabulary.map((item) => item.word).join(" · ")}</p>
            </div>
            {outsidePractice && lesson.lesson % 4 === 0 && <aside className="outside-practice">
              <span>Beyond LinguaThread · optional practice</span>
              <p>{outsidePractice.prompt}</p>
            </aside>}
            <button className="primary-action" onClick={continueLearning}>Continue learning <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={() => setStage("review")}>Review the stack</button>
            <button className="text-action edit-languages-action" onClick={onEditLanguages}>Edit language stack</button>
          </div>
        )}

        {stage === "review" && (
          <div className="focus-content review-content">
            <button className="back-action" onClick={() => setStage(hasHistory ? "complete" : "vocabulary")} aria-label="Back">←</button>
            <p className="eyebrow">Quiet review</p>
            <h1>Your language course</h1>
            <p className="review-introduction">A continuous Spanish and Vietnamese path from first foundations through precise, independent expression. Published lessons become available here as their language and X-Ray content pass review.</p>
            <button className="text-action edit-languages-action" onClick={onEditLanguages}>Edit language stack</button>
            <div className="cefr-course-map" aria-label="CEFR course path">
              {courseMap.map((stage) => {
                const authored = course.filter((item) => item.level === stage.level).length;
                return <section key={stage.level} className="cefr-stage">
                  <div><strong>{stage.level}</strong><span>{stage.units.length} units</span></div>
                  <p>{stage.outcome}</p>
                  <em>{authored > 0 ? `${authored} authored lesson${authored === 1 ? "" : "s"} available` : "Authoring in progress"}</em>
                </section>;
              })}
            </div>
            <p className="course-authoring-note">The permanent map contains {plannedCourseLessonCount} lesson positions. Only reviewed, publishable lessons enter your learning sequence.</p>
            <section className="literacy-paths" aria-label="Writing foundations for selected languages">
              <p className="eyebrow">Writing foundations</p>
              <h2>Learn the script or demonstrate what you know.</h2>
              <p>Each selected non-native language keeps its own recognition, writing, support, and review record.</p>
              <div>{literacyLanguages.map((item) => <button key={item.id} className="quiet-action" onClick={() => setScriptLanguage(item.id)}>{item.name} · Open writing path</button>)}</div>
            </section>
            <div className="review-list">
              {courseMap.map((level) => {
                const levelLessons = course.filter((item) => item.level === level.level);
                const containsCurrent = levelLessons.some((item) => item.id === lesson.id);
                const dueCount = levelLessons.filter((item) => reviewDueIds.includes(item.id)).length;
                return <details key={level.level} className="review-level" open={containsCurrent}>
                  <summary><span>{level.level}</span><strong>{containsCurrent ? "Current level" : `${levelLessons.length} lessons`}</strong><em>{dueCount ? `${dueCount} due` : "Explore"}</em></summary>
                  {levelLessons.map((item) => {
                    const index = course.findIndex((candidate) => candidate.id === item.id);
                    return <div className="review-row stacked-review-row" key={item.id}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{item.title}</strong>
                      <p>{item.level} · {item.unitTitle} · {item.skill}</p>
                      <em>{reviewDueIds.includes(item.id)
                        ? "Due"
                        : completedIds.includes(item.id)
                          ? languageMastery(learnerModel, item.objectiveId || item.id, "Spanish")
                          : index === lessonIndex ? "Next" : "Waiting"}</em>
                    </div>;
                  })}
                </details>;
              })}
            </div>
            <button className="primary-action" onClick={() => resetLesson()}>Return to lesson</button>
          </div>
        )}
        </>}
      </section>

      {xrayOpen && <UniversalXRay key={lesson.id} lesson={lesson} showBridge={bridgeEnabled} onClose={closeXRay} />}

      <footer className="lesson-footer">
        <span>{stage === "complete" ? `${completedIds.length} of ${course.length} published lessons mapped` : `Spanish target · ${profile.native} anchor · ${bridgeEnabled ? "Vietnamese active practice" : "native anchor"}`}</span>
        <span>{mastery ? "Level signal recorded" : "Text-first · No streaks, no scores"}</span>
      </footer>
    </main>
  );
}

function LanguageSetup({ initialProfile, onComplete }: { initialProfile?: LanguageProfile; onComplete: (profile: LanguageProfile) => void }) {
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [native, setNative] = useState(initialProfile?.native ?? "English");
  const [second, setSecond] = useState<string | null>(initialProfile?.second ?? "Vietnamese");
  const [secondConfidence, setSecondConfidence] = useState<Confidence>(initialProfile?.secondConfidence ?? "developing");
  const [additional, setAdditional] = useState<string[]>(initialProfile?.additional ?? ["Spanish"]);

  const target = additional[additional.length - 1] || second || "a new language";
  const publishedCommunicationTarget = target === "Spanish";
  const totalSteps = 4;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      headingRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  const goToStep = (nextStep: number) => setStep(Math.max(0, Math.min(totalSteps - 1, nextStep)));

  return (
    <main className="app-shell setup-shell">
      <header className="topline setup-topline">
        <span className="wordmark static-wordmark">LinguaThread</span>
        <div className="lesson-context"><span>Your language stack</span></div>
        <span className="setup-step-count">{step + 1} of {totalSteps}</span>
      </header>
      <div className="progress-track"><span style={{ width: `${((step + 1) / totalSteps) * 100}%` }} /></div>

      <section className="lesson-stage setup-stage">
        {step === 0 && (
          <SetupFrame headingRef={headingRef} eyebrow="Your native anchor" title="What language shaped your first thoughts?" description="LinguaThread uses your native language to make unfamiliar grammar immediately intelligible.">
            <LanguagePicker selected={[native]} excluded={[]} onSelect={(language) => setNative(language)} />
            <button className="primary-action" onClick={() => { if (second === native) setSecond(null); goToStep(1); }}>Continue <span aria-hidden="true">→</span></button>
          </SetupFrame>
        )}

        {step === 1 && (
          <SetupFrame headingRef={headingRef} onBack={() => goToStep(0)} eyebrow="Another language you know" title="What language became yours next?" description="It does not need to be fluent. LinguaThread will use it only when it makes the new language clearer.">
            <LanguagePicker selected={second ? [second] : []} excluded={[native]} onSelect={(language) => setSecond(language)} />
            {second && <ConfidencePicker value={secondConfidence} onChange={setSecondConfidence} />}
            <button className="primary-action" onClick={() => goToStep(2)}>Continue <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={() => { setSecond(null); goToStep(2); }}>I do not have another language yet</button>
          </SetupFrame>
        )}

        {step === 2 && (
          <SetupFrame headingRef={headingRef} onBack={() => goToStep(1)} eyebrow="The rest of your language life" title="Which other languages are part of you?" description="Add as many as you need, from stronger languages toward the ones still growing.">
            <LanguagePicker
              selected={additional}
              excluded={[native, ...(second ? [second] : [])]}
              multiple
              onSelect={(language) => setAdditional((current) => current.includes(language) ? current.filter((item) => item !== language) : [...current, language])}
            />
            <button className="primary-action" onClick={() => goToStep(3)}>Shape my stack <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={() => goToStep(3)}>That is enough for now</button>
          </SetupFrame>
        )}

        {step === 3 && (
          <div className="focus-content setup-content ready-content">
            <button className="setup-back" onClick={() => goToStep(2)} aria-label="Return to additional languages">←</button>
            <p className="eyebrow">Your learning architecture</p>
            <h1 ref={headingRef} tabIndex={-1}>Your languages can help one another.</h1>
            <div className="profile-stack">
              <ProfileLanguage index="01" role="Native anchor" language={native} />
              {second && <ProfileLanguage index="02" role="Supporting bridge" language={second} detail={confidenceLabels[secondConfidence]} />}
              {additional.map((language, index) => <ProfileLanguage key={language} index={String(index + (second ? 3 : 2)).padStart(2, "0")} role={index === additional.length - 1 && publishedCommunicationTarget ? "Growing edge" : "Writing path and bridge"} language={language} />)}
            </div>
            <p className="setup-description ready-description">{publishedCommunicationTarget ? `LinguaThread will begin with essential ${target} vocabulary and place it into daily conversation.` : `${target} has an independent, expanded Writing System path in this release. The reviewed communication course remains Spanish with Vietnamese active practice; LinguaThread will not substitute unreviewed ${target} lessons.`} Every explanation stays grounded in {native}; other languages appear only when they provide a useful bridge.</p>
            <button className="primary-action" onClick={() => onComplete({ native, second, secondConfidence: second ? secondConfidence : null, additional })}>{initialProfile ? "Save language stack" : "Begin with foundations"} <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={() => goToStep(0)}>Edit my languages</button>
          </div>
        )}
      </section>

      <footer className="lesson-footer"><span>Language begins from what you already know</span><span>How Language Is Built · Language stacking</span></footer>
    </main>
  );
}

function SetupFrame({ eyebrow, title, description, children, headingRef, onBack }: { eyebrow: string; title: string; description: string; children: React.ReactNode; headingRef: React.RefObject<HTMLHeadingElement | null>; onBack?: () => void }) {
  return <div className="focus-content setup-content">{onBack && <button className="setup-back" onClick={onBack} aria-label="Return to previous step">←</button>}<p className="eyebrow">{eyebrow}</p><h1 ref={headingRef} tabIndex={-1}>{title}</h1><p className="setup-description">{description}</p>{children}</div>;
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

  return (
    <div className="language-picker">
      <input className="language-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search languages" aria-label="Search languages" />
      <div className="language-options" role={multiple ? "group" : "radiogroup"} aria-label="Languages">
        {choices.map((language) => <button key={language} className={selected.includes(language) ? "selected" : ""} onClick={() => onSelect(language)} role={multiple ? undefined : "radio"} aria-checked={multiple ? undefined : selected.includes(language)}><span>{language}</span>{selected.includes(language) && <em>{multiple ? "Added" : "Selected"}</em>}</button>)}
      </div>
      {multiple && selected.length > 0 && <div className="selected-languages" aria-label="Selected additional languages">{selected.map((language) => <button key={language} onClick={() => onSelect(language)}>{language}<span aria-hidden="true">×</span></button>)}</div>}
    </div>
  );
}

function ProfileLanguage({ index, role, language, detail }: { index: string; role: string; language: string; detail?: string }) {
  return <div className="profile-language"><span>{index}</span><div><small>{role}{detail && <em> · {detail}</em>}</small><strong>{language}</strong></div></div>;
}

function StackLine({ role, language, value }: { role: string; language: string; value: string }) {
  const audioLanguage = speechLanguage(language);
  return <div className="stack-line"><span>{role}<small>{language}</small></span><div><strong>{value}</strong>{audioLanguage && <ListenButton text={value} language={audioLanguage} />}</div></div>;
}

function AnswerField({ value, onChange, onEnter, placeholder, label }: { value: string; onChange: (value: string) => void; onEnter: () => void; placeholder: string; label: string }) {
  return <input className="answer-field" autoFocus value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onEnter()} placeholder={placeholder} aria-label={label} />;
}

function Feedback({ kind, title, detail, action, onClick }: { kind: "correct" | "gentle"; title: string; detail?: string; action: string; onClick: () => void }) {
  return <div className={`feedback ${kind}`}><div><strong>{title}</strong>{detail && <p>{detail}</p>}</div><button onClick={onClick}>{action} <span aria-hidden="true">→</span></button></div>;
}

function RecoveryBuilder({ answer, language, onComplete, onSkip }: { answer: string; language: string; onComplete: () => void; onSkip: () => void }) {
  const [typedAnswer, setTypedAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const isCorrect = normalizeAnswer(typedAnswer) === normalizeAnswer(answer);

  return (
    <div className="recovery-builder">
      <p className="recovery-intro"><strong>Here is the model.</strong><span>Type it to reinforce the pattern, or skip this lesson for now.</span></p>
      <div className="target-model"><span>Target model</span><strong>{answer}</strong>{speechLanguage(language) && <ListenButton text={answer} language={speechLanguage(language)!} />}</div>
      <AnswerField value={typedAnswer} onChange={(value) => { setTypedAnswer(value); setChecked(false); }} onEnter={() => setChecked(true)} placeholder="Type the model" label="Supported answer" />
      {!checked && <button className="primary-action" onClick={() => setChecked(true)}>Check model</button>}
      {checked && isCorrect && <Feedback kind="correct" title="You rebuilt the meaning." detail="This will return in review so it can become available without support." action="Continue" onClick={onComplete} />}
      {checked && !isCorrect && <Feedback kind="gentle" title="Keep the model in view." detail="Type the model exactly, then continue." action="Try again" onClick={() => { setTypedAnswer(""); setChecked(false); }} />}
      <button className="text-action" onClick={onSkip}>Skip this lesson for now</button>
    </div>
  );
}

function TransformExercise({ lesson, onAttempt, onComplete, onSkip }: { lesson: LessonDefinition; onAttempt: (correct: boolean, supported: boolean, language: string) => void; onComplete: () => void; onSkip: () => void }) {
  const [answer, setAnswer] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "gentle">("idle");
  const modelVisible = failedAttempts >= 3;
  const targetLanguage = lesson.transform.language;
  const placeholder = targetLanguage === "Spanish" ? "Escribe en español" : targetLanguage === "Vietnamese" ? "Viết bằng tiếng Việt" : `Write in ${targetLanguage}`;

  function checkAnswer() {
    const passed = lesson.transform.accepted.map(normalizeAnswer).includes(normalizeAnswer(answer));
    onAttempt(passed, false, targetLanguage);
    if (!passed) setFailedAttempts((value) => value + 1);
    setFeedback(passed ? "correct" : "gentle");
  }

  return (
    <div className="focus-content transform-content">
      <p className="eyebrow">Build the target</p>
      <h1 className="exercise-title">{lesson.transform.prompt}</h1>
      <p className="bridge-reminder">{lesson.transform.bridgeReminder}</p>
      <AnswerField value={answer} onChange={(value) => { setAnswer(value); setFeedback("idle"); }} onEnter={checkAnswer} placeholder={placeholder} label={`${targetLanguage} target answer`} />
      {feedback === "idle" && <button className="primary-action" onClick={checkAnswer}>Check structure</button>}
      {modelVisible && <div className="target-model" role="status"><span>Target model</span><strong>{lesson.transform.answer}</strong>{speechLanguage(targetLanguage) && <ListenButton text={lesson.transform.answer} language={speechLanguage(targetLanguage)!} />}<p>Type this sentence to secure the pattern, or skip this lesson for now.</p></div>}
      {feedback === "gentle" && !modelVisible && <Feedback kind="gentle" title={lesson.transform.hint} detail={`${failedAttempts} of 3 attempts. Try again from the structure.`} action="Try again" onClick={() => { setAnswer(""); setFeedback("idle"); }} />}
      {feedback === "gentle" && modelVisible && <Feedback kind="gentle" title="Here is the model." detail="Read it, type it, and let the sentence settle into the stack." action="Try again" onClick={() => { setAnswer(""); setFeedback("idle"); }} />}
      {feedback === "correct" && <Feedback kind="correct" title="Natural and complete." detail="You produced the target sentence from the structure." action="Final check" onClick={onComplete} />}
      {modelVisible && <button className="text-action" onClick={onSkip}>Skip this lesson for now</button>}
    </div>
  );
}

function ReverseRecall({ exercise, position, total, onAttempt, onComplete, onSkip }: { exercise: LessonTranslationExercise; position: number; total: number; onAttempt: (correct: boolean, language: string) => void; onComplete: () => void; onSkip: () => void }) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [failedAttempts, setFailedAttempts] = useState(0);

  function checkAnswer() {
    const passed = exercise.accepted.map(normalizeAnswer).includes(normalizeAnswer(answer));
    onAttempt(passed, exercise.evidenceLanguage);
    if (!passed) setFailedAttempts((value) => value + 1);
    setFeedback(passed ? "correct" : "gentle");
  }

  return <div className="focus-content exercise-content reverse-recall">
    <p className="eyebrow">Reverse recall · {position} of {total}</p>
    <p className="translation-direction">{exercise.from} <span aria-hidden="true">→</span> {exercise.to}</p>
    <h1 className="exercise-title" lang={exercise.from === "Spanish" ? "es" : "vi"}>{exercise.prompt}</h1>
    <p className="instruction">{exercise.instruction}</p>
    {speechLanguage(exercise.from) && <div className="reverse-audio"><ListenButton text={exercise.prompt} language={speechLanguage(exercise.from)!} /></div>}
    {failedAttempts < 3 ? <>
      <AnswerField value={answer} onChange={(value) => { setAnswer(value); setFeedback("idle"); }} onEnter={checkAnswer} placeholder="Write the English meaning" label="English answer" />
      {feedback === "idle" && <button className="primary-action" disabled={!answer.trim()} onClick={checkAnswer}>Check meaning</button>}
    </> : <RecoveryBuilder answer={exercise.answer} language={exercise.to} onComplete={onComplete} onSkip={onSkip} />}
    {feedback === "gentle" && failedAttempts < 3 && <Feedback kind="gentle" title="Return to the complete meaning." detail={`${failedAttempts} of 3 attempts · Read the ${exercise.from} as a whole.`} action="Try again" onClick={() => { setAnswer(""); setFeedback("idle"); }} />}
    {feedback === "correct" && <Feedback kind="correct" title={exercise.answer} detail={`You recovered the meaning directly from ${exercise.from}.`} action={position < total ? "Continue reverse recall" : "Complete lesson"} onClick={onComplete} />}
  </div>;
}
