"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { curriculum, LessonDefinition, normalizeAnswer, sentenceAnatomyForLesson } from "./curriculum";
import { InteractiveSentence } from "./sentence-anatomy";
import { UniversalXRay } from "./universal-xray";
import { FirstLaunchIntro } from "./first-launch-intro";
import ListenButton from "./listen-button";
import { speechLanguage } from "./speech";
import type { FoundationLanguage } from "./multilingual-foundation";
import "./multilingual-preview/preview.css";
import { createReverseRecallExercises, type LessonTranslationExercise } from "./lesson-tools";
import { loadCurriculum } from "./curriculum-cache";
import { outsidePracticeFor } from "./course-map";
import { planStackSession } from "./stack-coordination";
import {
  activeSelections, chooseAuthoritativeProfile, LanguageName, LanguageProfile,
  LanguageSelection, markProfileSynchronized, normalizeLanguageProfile,
  supportedLanguageNames, updateSelections,
} from "./language-profile";
import {
  completeSession, coordinateLanguageProgress, emptyLearnerModel, LearnerModel, RetrievalEdge,
  migrateCompletedLessons, normalizeLearnerModel, recordEvidence, selectNextLesson,
} from "./learning-engine";

type Stage = "vocabulary" | "recall" | "sentence" | "grammar" | "transform" | "mastery" | "reverse" | "complete";
type AppDestination = "lesson" | "path" | "writing" | "xray";
type FeedbackState = "idle" | "correct" | "gentle";
type Confidence = "developing" | "comfortable" | "strong";
type ProductionLanguage = "Spanish" | "Vietnamese";

const commonLanguages = [...supportedLanguageNames];

const stages: Stage[] = ["vocabulary", "recall", "sentence", "grammar", "transform", "mastery", "reverse", "complete"];
const learnerIdKey = "linguathread.learner-id.v1";
const learnerModelKey = "linguathread.learner-model.v1";
const lessonSessionKey = "linguathread.main-lesson-session.v1";
const legacyLanguageProfileKey = "linguathread.language-profile.v1";
const languageProfileKey = "linguathread.language-profile.v2";

const jsonHeaders = { "content-type": "application/json" };
const ScriptCourseView = dynamic(() => import("./writing-system/view"), { loading: () => <p role="status">Opening writing foundations…</p> });

export default function Home() {
  const [profile, setProfile] = useState<LanguageProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [launchState, setLaunchState] = useState<"checking" | "intro" | "app">("checking");
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  // Profile reconciliation is intentionally a one-time installation bootstrap.
  useEffect(() => {
    const saved = window.localStorage.getItem(languageProfileKey) || window.localStorage.getItem(legacyLanguageProfileKey);
    const legacyLearnerId = window.localStorage.getItem(learnerIdKey);
    let localProfile: LanguageProfile | null = null;
    if (saved) try {
      localProfile = normalizeLanguageProfile(JSON.parse(saved));
    } catch { /* Keep the legacy record available for a future recovery attempt. */ }

    fetch("/api/session", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ legacyLearnerId }) })
      .then(async (response) => {
        const session = response.ok ? await response.json() as { legacyClaimed?: boolean } : {};
        if (session.legacyClaimed) window.localStorage.removeItem(learnerIdKey);
        const profileResponse = await fetch("/api/profile");
        const data = profileResponse.ok ? await profileResponse.json() as { profile?: unknown; updatedAt?: number } : {};
        const remoteProfile = normalizeLanguageProfile(data.profile, data.updatedAt);
        const nextProfile = chooseAuthoritativeProfile(localProfile, remoteProfile);
        if (nextProfile) window.localStorage.setItem(languageProfileKey, JSON.stringify(nextProfile));
        setProfile(nextProfile);
        if (nextProfile?.syncPending) void synchronizeProfile(nextProfile);
        setLaunchState("intro");
      })
      .catch(() => {
        setProfile(localProfile);
        setLaunchState("intro");
      })
      .finally(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function synchronizeProfile(pending: LanguageProfile) {
    try {
      const response = await fetch("/api/profile", { method: "PUT", headers: jsonHeaders, body: JSON.stringify(pending), keepalive: true });
      const data = await response.json().catch(() => ({})) as { profile?: unknown; localOnly?: boolean; error?: string };
      if (response.status === 409) {
        const current = normalizeLanguageProfile(data.profile);
        const resolved = chooseAuthoritativeProfile(pending, current);
        if (resolved === pending) return synchronizeProfile({ ...pending, revision: Math.max(pending.revision, current?.revision || 0) + 1, modifiedAt: Date.now() });
        if (resolved) {
          window.localStorage.setItem(languageProfileKey, JSON.stringify(resolved));
          setProfile(resolved);
        }
        return;
      }
      if (!response.ok) throw new Error(data.error || "Language settings could not be synchronized.");
      const canonical = normalizeLanguageProfile(data.profile) || (data.localOnly ? pending : markProfileSynchronized(pending));
      window.localStorage.setItem(languageProfileKey, JSON.stringify(canonical));
      setProfile(canonical);
      setProfileSaveError(data.localOnly ? "Saved on this device. Cloud synchronization is unavailable." : null);
    } catch {
      setProfileSaveError("Saved on this device. LinguaThread will synchronize these language settings when the connection returns.");
    }
  }

  function saveProfile(nextProfile: LanguageProfile) {
    const current = profile || nextProfile;
    const pending = updateSelections({ ...nextProfile, revision: current.revision, modifiedAt: current.modifiedAt }, nextProfile.selections);
    window.localStorage.setItem(languageProfileKey, JSON.stringify(pending));
    try {
      const model = normalizeLearnerModel(JSON.parse(window.localStorage.getItem(learnerModelKey) || "null"));
      window.localStorage.setItem(learnerModelKey, JSON.stringify(coordinateLanguageProgress(model, pending.selections)));
    } catch { /* Language settings remain authoritative even if old progress is unreadable. */ }
    setProfile(pending);
    setEditingProfile(false);
    setProfileSaveError(null);
    void synchronizeProfile(pending);
  }

  if (!loaded || launchState === "checking") return <main className="app-shell launch-loading" aria-label="Loading LinguaThread" />;
  if (launchState === "intro") return <FirstLaunchIntro onBegin={() => setLaunchState("app")} />;
  if (!profile) return <LanguageSetup onComplete={saveProfile} />;
  return <>
    <div inert={editingProfile ? true : undefined} aria-hidden={editingProfile || undefined}>
      <Lesson profile={profile} onEditLanguages={() => setEditingProfile(true)} />
    </div>
    {profileSaveError && <p className="profile-save-status" role="status">{profileSaveError}</p>}
    {editingProfile && <div className="language-editor-overlay" role="dialog" aria-modal="true" aria-label="Languages"><LanguageSetup initialProfile={profile} onComplete={saveProfile} onCancel={() => setEditingProfile(false)} /></div>}
  </>;
}

function Lesson({ profile, onEditLanguages }: { profile: LanguageProfile; onEditLanguages: () => void }) {
  const [stage, setStage] = useState<Stage>("vocabulary");
  const [wordIndex, setWordIndex] = useState(0);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
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
  const [destination, setDestination] = useState<AppDestination>("lesson");
  const [xrayOpen, setXrayOpen] = useState(false);
  const [scriptLanguage, setScriptLanguage] = useState<FoundationLanguage | null>(null);
  const [placementUnit, setPlacementUnit] = useState<{ level: string; unit: number } | null>(null);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const xrayTriggerRef = useRef<HTMLButtonElement>(null);
  const lessonStageRef = useRef<HTMLElement>(null);
  const attemptStartedAtRef = useRef(0);
  const initialScriptLanguageRef = useRef(speechLanguage(activeSelections(profile)[0]?.language || ""));
  const lesson = course[lessonIndex] || course[0];

  useEffect(() => {
    attemptStartedAtRef.current = Date.now();
  }, [stage, wordIndex, productionLanguage, reverseIndex, destination, scriptLanguage]);

  useEffect(() => {
    const resetLessonScroll = () => lessonStageRef.current?.scrollTo({ top: 0, behavior: "auto" });
    let portrait = window.innerHeight >= window.innerWidth;
    const resetAfterRotation = () => {
      const nextPortrait = window.innerHeight >= window.innerWidth;
      if (nextPortrait !== portrait) {
        portrait = nextPortrait;
        resetLessonScroll();
      }
    };
    resetLessonScroll();
    window.addEventListener("orientationchange", resetLessonScroll);
    window.addEventListener("resize", resetAfterRotation);
    return () => {
      window.removeEventListener("orientationchange", resetLessonScroll);
      window.removeEventListener("resize", resetAfterRotation);
    };
  }, [stage, wordIndex, productionLanguage, reverseIndex, destination, scriptLanguage]);

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
        let restored = false;
        try {
          const savedSession = JSON.parse(window.localStorage.getItem(lessonSessionKey) || "null") as { lessonId?: string; stage?: Stage; wordIndex?: number; answer?: string; feedback?: FeedbackState; failedAttempts?: number; productionLanguage?: ProductionLanguage; reverseIndex?: number; destination?: AppDestination; scriptLanguage?: FoundationLanguage } | null;
          const restoredIndex = savedSession?.lessonId ? loadedCourse.findIndex((item) => item.id === savedSession.lessonId) : -1;
          if (savedSession && restoredIndex >= 0 && savedSession.stage && stages.includes(savedSession.stage)) {
            setLessonIndex(restoredIndex); setStage(savedSession.stage); setWordIndex(Math.max(0, savedSession.wordIndex || 0));
            setAnswer(savedSession.answer || ""); setFeedback(savedSession.feedback || "idle"); setFailedAttempts(Math.max(0, savedSession.failedAttempts || 0));
            setProductionLanguage(savedSession.productionLanguage === "Vietnamese" ? "Vietnamese" : "Spanish"); setReverseIndex(Math.max(0, savedSession.reverseIndex || 0));
            const restoredDestination = savedSession.destination && ["lesson", "path", "writing", "xray"].includes(savedSession.destination) ? savedSession.destination : "lesson";
            setDestination(restoredDestination); setXrayOpen(restoredDestination === "xray");
            if (restoredDestination === "writing") setScriptLanguage(savedSession.scriptLanguage || initialScriptLanguageRef.current || null);
            restored = true;
          }
        } catch { /* A malformed session cannot affect durable progress. */ }
        if (!restored) {
          const selection = selectNextLesson(loadedCourse, localModel, completed);
          setLessonIndex(Math.max(0, loadedCourse.findIndex((item) => item.id === selection.lesson.id)));
          setSessionMode(selection.mode);
        }
        setSessionHydrated(true);
        if (data.completedLessonIds?.length) {
          window.localStorage.setItem("linguathread.completed-lessons.v1", JSON.stringify(data.completedLessonIds));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!sessionHydrated || !lesson) return;
    window.localStorage.setItem(lessonSessionKey, JSON.stringify({
      lessonId: lesson.id, stage, wordIndex, answer, feedback, failedAttempts,
      productionLanguage, reverseIndex, destination, scriptLanguage,
    }));
  }, [answer, destination, failedAttempts, feedback, lesson, productionLanguage, reverseIndex, scriptLanguage, sessionHydrated, stage, wordIndex]);

  const selectedLearningLanguages = activeSelections(profile).map((item) => item.language)
    .filter((language) => language !== profile.native);
  const stackSession = planStackSession(profile.selections, coordinateLanguageProgress(learnerModel, profile.selections));
  const activeLanguages = selectedLearningLanguages
    .map((language) => language.trim().toLocaleLowerCase());
  const bridgeEnabled = activeLanguages.includes("vietnamese");
  const stageIndex = Math.max(0, stages.indexOf(stage));
  const progress = ((stageIndex + (stage === "vocabulary" ? wordIndex / lesson.vocabulary.length : 0)) / (stages.length - 1)) * 100;
  const currentWord = lesson.vocabulary[wordIndex];
  const outsidePractice = outsidePracticeFor(lesson.level, lesson.unit);
  const reverseExercises = createReverseRecallExercises(lesson, bridgeEnabled);
  const literacyLanguages = selectedLearningLanguages
    .map((language) => ({ name: language, id: speechLanguage(language) }))
    .filter((item): item is { name: LanguageName; id: FoundationLanguage } => item.id !== null);
  const courseUnits = course.reduce<Array<{ key: string; level: string; unit: number; title: string; lessons: LessonDefinition[] }>>((units, item) => {
    const key = `${item.level}-${item.unit}`;
    const existing = units.find((unit) => unit.key === key);
    if (existing) existing.lessons.push(item);
    else units.push({ key, level: item.level, unit: item.unit, title: item.unitTitle, lessons: [item] });
    return units;
  }, []);
  const courseLevels = [...new Set(courseUnits.map((unit) => unit.level))];

  function openDestination(next: AppDestination) {
    setDestination(next);
    setXrayOpen(next === "xray");
    setPlacementUnit(null);
    if (next === "writing") setScriptLanguage((current) => current || literacyLanguages[0]?.id || null);
    else setScriptLanguage(null);
  }

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
    fetch("/api/progress", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ type: "complete", lessonId: lesson.id, skill: lesson.skill, accelerated }), keepalive: true }).catch(() => undefined);
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
    setDestination("lesson");
    requestAnimationFrame(() => xrayTriggerRef.current?.focus());
  }

  function completeUnitPlacement(unitLessons: LessonDefinition[], passed: boolean) {
    if (!passed) return;
    const ids = unitLessons.map((item) => item.id);
    const nextCompleted = [...new Set([...completedIds, ...ids])];
    setCompletedIds(nextCompleted);
    window.localStorage.setItem("linguathread.completed-lessons.v1", JSON.stringify(nextCompleted));
    let nextModel = learnerModel;
    for (const item of unitLessons) {
      nextModel = recordEvidence(nextModel, item.objectiveId || item.id, "Spanish", true, false, new Date(), {
        fromLanguage: "English", toLanguage: "Spanish", fromModality: "meaning", toModality: "written", retrievalType: "production",
      });
      fetch("/api/progress", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ type: "complete", lessonId: item.id, skill: item.skill, accelerated: true }), keepalive: true }).catch(() => undefined);
    }
    setLearnerModel(nextModel);
    window.localStorage.setItem(learnerModelKey, JSON.stringify(nextModel));
  }

  return (
    <main className={`app-shell stage-${stage}`}>
      <header className="topline">
        <button className="wordmark" onClick={() => openDestination("lesson")} aria-label="Open current lesson">LinguaThread</button>
        <div className="lesson-context">
          <span className="language-mark">ES</span>
          <span>{lesson.level} · {lesson.unitTitle} · {String(lesson.lesson).padStart(2, "0")} · {sessionMode === "new" ? "New" : sessionMode === "review" ? "Review" : "Strengthen"}</span>
        </div>
        <nav className="header-actions" aria-label="Learning destinations">
          <button className="quiet-action today-action" aria-current={destination === "lesson" ? "page" : undefined} onClick={() => openDestination("lesson")}>Today’s Lesson</button>
          <button className="quiet-action" aria-current={destination === "path" ? "page" : undefined} onClick={() => openDestination("path")}>Language Path</button>
          {literacyLanguages[0] && <button className="quiet-action writing-action" aria-current={destination === "writing" ? "page" : undefined} onClick={() => openDestination("writing")}>Writing System</button>}
          <button ref={xrayTriggerRef} className="quiet-action xray-action" aria-current={destination === "xray" ? "page" : undefined} onClick={() => openDestination("xray")}>Expression X-Ray</button>
          <button className="quiet-action languages-action" onClick={onEditLanguages}>Languages</button>
        </nav>
      </header>

      {destination === "lesson" && stage !== "complete" && (
        <div className="progress-track" aria-label={`Lesson ${Math.round(progress)}% complete`}>
          <span style={{ width: `${Math.max(4, progress)}%` }} />
        </div>
      )}

      <section ref={lessonStageRef} className="lesson-stage" aria-live="polite">
        {destination === "writing" && scriptLanguage ? <div className="focus-content"><ScriptCourseView key={scriptLanguage} language={scriptLanguage} languages={literacyLanguages} currentLesson={lesson} onLanguage={setScriptLanguage} onClose={() => openDestination("lesson")} onEvidence={recordScriptEvidence} /></div> : destination === "path" ? (
          placementUnit ? (() => {
            const unit = courseUnits.find((item) => item.level === placementUnit.level && item.unit === placementUnit.unit)!;
            return <UnitPlacement unit={unit} onClose={() => setPlacementUnit(null)} onFinish={(passed) => completeUnitPlacement(unit.lessons, passed)} onStudy={() => { const index = course.findIndex((item) => item.id === unit.lessons[0].id); resetLesson(index); openDestination("lesson"); }} />;
          })() : <div className="focus-content review-content">
            <p className="eyebrow">Language path</p>
            <h1>Your language course, clearly mapped.</h1>
            <p className="review-introduction">Spanish is the reviewed communication course. Your other selected languages remain visible as independent writing paths and future stacking bridges. Authoring in progress is shown honestly. Only reviewed, publishable lessons enter your learning sequence.</p>
            <section className="stack-overview" aria-label="Your selected language stack">
              <div><span>Native anchor</span><strong>{profile.native}</strong></div>
              {selectedLearningLanguages.map((language) => <div key={language}><span>{language === "Spanish" ? "Communication course" : "Selected language"}</span><strong>{language}</strong>{literacyLanguages.some((item) => item.name === language) && <button className="text-action" onClick={() => { setScriptLanguage(literacyLanguages.find((item) => item.name === language)!.id); setDestination("writing"); }}>Writing path</button>}</div>)}
              <button className="quiet-action stack-edit-action" onClick={onEditLanguages}>Add or remove languages</button>
            </section>
            <div className="unit-path" aria-label="Course units">
              {courseLevels.map((level) => {
                const units = courseUnits.filter((unit) => unit.level === level);
                const currentLevel = units.some((unit) => unit.lessons.some((item) => item.id === lesson.id));
                const completed = units.flatMap((unit) => unit.lessons).filter((item) => completedIds.includes(item.id)).length;
                const total = units.reduce((sum, unit) => sum + unit.lessons.length, 0);
                return <details key={level} open={currentLevel} className="level-group">
                  <summary><strong>{level}</strong><span>{completed} of {total} lessons</span></summary>
                  {units.map((unit) => {
                    const unitCompleted = unit.lessons.filter((item) => completedIds.includes(item.id)).length;
                    const current = unit.lessons.some((item) => item.id === lesson.id);
                    return <details key={unit.key} open={current} className="unit-card">
                      <summary><span>Unit {unit.unit}</span><strong>{unit.title}</strong><em>{unitCompleted} of {unit.lessons.length}</em></summary>
                      <div className="unit-card-actions"><button className="quiet-action" onClick={() => setPlacementUnit({ level: unit.level, unit: unit.unit })}>{unitCompleted === unit.lessons.length ? "Recheck this unit" : "Test out of this unit"}</button></div>
                      {unit.lessons.map((item) => {
                        const index = course.findIndex((candidate) => candidate.id === item.id);
                        return <button className="unit-lesson-row" key={item.id} onClick={() => { resetLesson(index); openDestination("lesson"); }}><span>{String(item.lesson).padStart(2, "0")}</span><strong>{item.title}</strong><em>{completedIds.includes(item.id) ? "Complete" : index === lessonIndex ? "Next" : "Open"}</em></button>;
                      })}
                    </details>;
                  })}
                </details>;
              })}
            </div>
          </div>
        ) : <>
        {stage === "vocabulary" && (
          <div className="focus-content vocab-content" key={currentWord.word}>
            <p className="eyebrow">{lesson.title} · {wordIndex + 1} of {lesson.vocabulary.length}</p>
            <h1>{currentWord.word}</h1>
            <ListenButton text={currentWord.word} language="es" />
            <div className="language-stack compact-stack">
              <StackLine role="Meaning anchor" language="English" value={currentWord.english} />
              {bridgeEnabled && <StackLine role="Supporting bridge" language="Vietnamese" value={currentWord.vietnamese} />}
            </div>
            <button className="selected-stack-ribbon" onClick={onEditLanguages}><span>Your selected stack</span>{selectedLearningLanguages.join(" · ")}</button>
            <p className="stack-session-note">{stackSession.explanation}</p>
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
                  <article><span className="grammar-language">English · meaning anchor</span><strong>{lesson.grammar.anchor.pattern}</strong><p>{lesson.grammar.anchor.explanation}</p></article>
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
            <button className="text-action" onClick={() => openDestination("path")}>Review the stack</button>
            <button className="text-action edit-languages-action" onClick={onEditLanguages}>Edit language stack</button>
          </div>
        )}

        </>}
      </section>

      {xrayOpen && <UniversalXRay key={lesson.id} lesson={lesson} showBridge={bridgeEnabled} onClose={closeXRay} />}

      <footer className="lesson-footer">
        <span>{stage === "complete" ? `${completedIds.length} of ${course.length} published lessons mapped` : `Spanish course · English meaning anchor · ${selectedLearningLanguages.length} selected language${selectedLearningLanguages.length === 1 ? "" : "s"}`}</span>
        <span>{mastery ? "Level signal recorded" : "Text-first · No streaks, no scores"}</span>
      </footer>
    </main>
  );
}

function UnitPlacement({ unit, onClose, onFinish, onStudy }: {
  unit: { level: string; unit: number; title: string; lessons: LessonDefinition[] };
  onClose: () => void;
  onFinish: (passed: boolean) => void;
  onStudy: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<"idle" | "correct" | "gentle" | "passed" | "review">("idle");
  const current = unit.lessons[index];
  const required = Math.max(1, Math.ceil(unit.lessons.length * .75));

  function check() {
    const correct = current.mastery.accepted.map(normalizeAnswer).includes(normalizeAnswer(answer));
    setResult(correct ? "correct" : "gentle");
  }

  function advance() {
    const earned = result === "correct" ? 1 : 0;
    const nextScore = score + earned;
    if (index === unit.lessons.length - 1) {
      const passed = nextScore >= required;
      setScore(nextScore);
      setResult(passed ? "passed" : "review");
      onFinish(passed);
      return;
    }
    setScore(nextScore);
    setIndex((value) => value + 1);
    setAnswer("");
    setResult("idle");
  }

  if (result === "passed" || result === "review") return <div className="focus-content placement-content">
    <p className="eyebrow">{unit.level} · Unit {unit.unit}</p>
    <h1>{result === "passed" ? "This unit is already yours." : "A little focused study will help."}</h1>
    <p className="instruction">You recalled {score} of {unit.lessons.length} independently. {result === "passed" ? "The unit is marked complete and your next available material has moved forward." : `Passing requires ${required}. No lesson was marked complete.`}</p>
    {result === "passed" ? <button className="primary-action" onClick={onClose}>Return to the path <span aria-hidden="true">→</span></button> : <button className="primary-action" onClick={onStudy}>Begin this unit <span aria-hidden="true">→</span></button>}
    <button className="text-action" onClick={onClose}>Return to the course map</button>
  </div>;

  return <div className="focus-content placement-content">
    <button className="back-action" onClick={onClose} aria-label="Leave unit check">←</button>
    <p className="eyebrow">Test out · {unit.level} Unit {unit.unit} · {index + 1} of {unit.lessons.length}</p>
    <h1>{unit.title}</h1>
    <p className="instruction">{current.mastery.prompt}</p>
    <AnswerField value={answer} onChange={(value) => { setAnswer(value); setResult("idle"); }} onEnter={check} placeholder="Write in Spanish" label="Unit check answer" />
    {result === "idle" && <button className="primary-action" disabled={!answer.trim()} onClick={check}>Check answer</button>}
    {result === "correct" && <Feedback kind="correct" title="Independent recall confirmed." detail={current.mastery.answer} action={index === unit.lessons.length - 1 ? "Finish check" : "Next question"} onClick={advance} />}
    {result === "gentle" && <Feedback kind="gentle" title="This pathway needs review." detail={`Model: ${current.mastery.answer}`} action={index === unit.lessons.length - 1 ? "Finish check" : "Continue check"} onClick={advance} />}
    <p className="placement-standard">Pass with {required} of {unit.lessons.length} independent responses. The check never reveals a model before you answer.</p>
  </div>;
}

function LanguageSetup({ initialProfile, onComplete, onCancel }: { initialProfile?: LanguageProfile; onComplete: (profile: LanguageProfile) => void; onCancel?: () => void }) {
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [native, setNative] = useState<LanguageName>(initialProfile?.native ?? "English");
  const [second, setSecond] = useState<LanguageName | null>(initialProfile?.second ?? "Vietnamese");
  const [secondConfidence, setSecondConfidence] = useState<Confidence>(initialProfile?.secondConfidence ?? "developing");
  const [additional, setAdditional] = useState<LanguageName[]>(initialProfile?.additional ?? ["Spanish"]);
  const [startingChoices, setStartingChoices] = useState<Record<string, { communicationStart: "foundations" | "check"; writingStart: "foundations" | "check" }>>(() => Object.fromEntries(
    (initialProfile?.selections || []).map((item) => [item.language, { communicationStart: item.communicationStart, writingStart: item.writingStart }]),
  ));

  const selectedLearningLanguages = Array.from(new Set([...(second ? [second] : []), ...additional]));
  const totalSteps = 4;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      headingRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  const goToStep = (nextStep: number) => setStep(Math.max(0, Math.min(totalSteps - 1, nextStep)));

  function setLearningOrder(next: LanguageName[]) {
    setSecond(next[0] || null);
    setAdditional(next.slice(1));
  }

  function moveLanguage(index: number, delta: number) {
    const next = [...selectedLearningLanguages] as LanguageName[];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setLearningOrder(next);
  }

  function completeSetup() {
    // Called only by the explicit save event.
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const selected = selectedLearningLanguages as LanguageName[];
    const retained = new Map((initialProfile?.selections || []).map((item) => [item.language, item]));
    const active: LanguageSelection[] = selected.map((name, priority) => {
      const previous = retained.get(name);
      const choice = startingChoices[name];
      return {
        language: name, status: "active", priority,
        communicationStart: choice?.communicationStart || previous?.communicationStart || "foundations",
        writingStart: choice?.writingStart || previous?.writingStart || "foundations",
        addedAt: previous?.addedAt || now,
      };
    });
    const paused: LanguageSelection[] = [...retained.values()]
      .filter((item) => !selected.includes(item.language) && item.language !== native)
      .map((item, index) => ({ ...item, status: "paused", priority: active.length + index }));
    const base = normalizeLanguageProfile({
      ...(initialProfile || {}), schemaVersion: 2, revision: initialProfile?.revision || 0,
      modifiedAt: initialProfile?.modifiedAt || now, native, second: active[0]?.language || null,
      secondConfidence: active.length ? secondConfidence : null,
      additional: active.slice(1).map((item) => item.language), selections: [...active, ...paused],
    }, now)!;
    onComplete(base);
  }

  return (
    <main className="app-shell setup-shell">
      <header className="topline setup-topline">
        <span className="wordmark static-wordmark">LinguaThread</span>
        <div className="lesson-context"><span>Your language stack</span></div>
        <div className="setup-exit">{onCancel && <button className="text-action" onClick={onCancel}>Cancel</button>}<span className="setup-step-count">{step + 1} of {totalSteps}</span></div>
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
          <SetupFrame headingRef={headingRef} onBack={() => goToStep(0)} eyebrow="Your first learning priority" title="Which language would you like to learn?" description="This language keeps its own curriculum position and mastery. You can add more without restarting it.">
            <LanguagePicker selected={second ? [second] : []} excluded={[native]} onSelect={(language) => setSecond(language)} />
            {second && <ConfidencePicker value={secondConfidence} onChange={setSecondConfidence} />}
            <button className="primary-action" onClick={() => goToStep(2)}>Continue <span aria-hidden="true">→</span></button>
            <button className="text-action" onClick={() => { setSecond(null); goToStep(2); }}>Choose several languages together</button>
          </SetupFrame>
        )}

        {step === 2 && (
          <SetupFrame headingRef={headingRef} onBack={() => goToStep(1)} eyebrow="Your complete learning stack" title="Which other languages would you like to learn?" description="Add, pause, and reorder languages without losing the independent progress already earned in any of them.">
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
              {selectedLearningLanguages.map((language, index) => <div className="profile-language-editor" key={language}>
                <ProfileLanguage index={String(index + 2).padStart(2, "0")} role={index === 0 ? "First learning priority" : "Selected learning language"} language={language} detail={index === 0 ? confidenceLabels[secondConfidence] : undefined} />
                <div className="profile-language-actions" aria-label={`${language} settings`}>
                  <button disabled={index === 0} onClick={() => moveLanguage(index, -1)} aria-label={`Move ${language} earlier`}>↑</button>
                  <button disabled={index === selectedLearningLanguages.length - 1} onClick={() => moveLanguage(index, 1)} aria-label={`Move ${language} later`}>↓</button>
                  <button onClick={() => setLearningOrder(selectedLearningLanguages.filter((item) => item !== language) as LanguageName[])}>Pause</button>
                </div>
                {!initialProfile?.selections.some((item) => item.language === language) && <div className="language-starting-points">
                  <span>{language} · communication</span>
                  <button className={(startingChoices[language]?.communicationStart || "foundations") === "foundations" ? "selected" : ""} onClick={() => setStartingChoices((current) => ({ ...current, [language]: { communicationStart: "foundations", writingStart: current[language]?.writingStart || "foundations" } }))}>Begin foundations</button>
                  <button className={startingChoices[language]?.communicationStart === "check" ? "selected" : ""} onClick={() => setStartingChoices((current) => ({ ...current, [language]: { communicationStart: "check", writingStart: current[language]?.writingStart || "foundations" } }))}>Check my knowledge</button>
                  <span>{language} · writing system</span>
                  <button className={(startingChoices[language]?.writingStart || "foundations") === "foundations" ? "selected" : ""} onClick={() => setStartingChoices((current) => ({ ...current, [language]: { communicationStart: current[language]?.communicationStart || "foundations", writingStart: "foundations" } }))}>Begin script foundations</button>
                  <button className={startingChoices[language]?.writingStart === "check" ? "selected" : ""} onClick={() => setStartingChoices((current) => ({ ...current, [language]: { communicationStart: current[language]?.communicationStart || "foundations", writingStart: "check" } }))}>Check script knowledge</button>
                </div>}
              </div>)}
            </div>
            <p className="setup-description ready-description">Your complete {selectedLearningLanguages.length}-language selection is retained and remains available from every primary screen. Spanish currently has the reviewed communication course; each selected language has its own independent Writing System path where applicable. Explanations remain grounded in {native}, and LinguaThread will never silently substitute an unreviewed lesson for a language you chose.</p>
            <button className="primary-action" onClick={completeSetup}>{initialProfile ? "Save language stack" : "Begin with foundations"} <span aria-hidden="true">→</span></button>
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

function LanguagePicker({ selected, excluded, multiple = false, onSelect }: { selected: LanguageName[]; excluded: LanguageName[]; multiple?: boolean; onSelect: (language: LanguageName) => void }) {
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
  return <div className="stack-line"><span>{role}<small>{language}</small></span><div><strong>{value}</strong>{audioLanguage && <ListenButton text={value} language={audioLanguage} compact />}</div></div>;
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
