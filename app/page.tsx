"use client";

import { useEffect, useState } from "react";

type Stage = "vocabulary" | "recall" | "sentence" | "grammar" | "transform" | "mastery" | "complete" | "review";
type FeedbackState = "idle" | "correct" | "gentle";
type Confidence = "developing" | "comfortable" | "strong";
type LanguageProfile = { native: string; second: string | null; secondConfidence: Confidence | null; additional: string[] };

const commonLanguages = [
  "English", "Spanish", "Vietnamese", "French", "Portuguese", "German",
  "Italian", "Mandarin Chinese", "Cantonese", "Japanese", "Korean", "Arabic",
  "Hindi", "Russian", "Dutch", "Turkish", "Indonesian", "Thai", "Tagalog", "Swahili",
];

const vocabulary = [
  { word: "yo", english: "I", vietnamese: "mình / tôi", note: "Spanish has one neutral first-person singular. Vietnamese chooses a pronoun through relationship and context." },
  { word: "tú", english: "you", vietnamese: "bạn", note: "Tú is informal singular. Like Vietnamese pronouns, it already says something about the relationship." },
  { word: "soy", english: "I am", vietnamese: "mình là / tôi là", note: "Soy is ser shaped for yo. Spanish can omit yo because the verb already carries it." },
  { word: "eres", english: "you are", vietnamese: "bạn là", note: "Eres is ser shaped for tú. Vietnamese là does not change with the person." },
  { word: "de", english: "from / of", vietnamese: "từ / của", note: "A small word that connects origin, belonging, material, and relationship." },
];

const stages: Stage[] = ["vocabulary", "recall", "sentence", "grammar", "transform", "mastery", "complete"];

export default function Home() {
  const [profile, setProfile] = useState<LanguageProfile | null>(null);
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
  }

  if (!loaded || !profile) return <LanguageSetup onComplete={saveProfile} />;
  return <Lesson profile={profile} onEditLanguages={() => setProfile(null)} />;
}

function Lesson({ profile, onEditLanguages }: { profile: LanguageProfile; onEditLanguages: () => void }) {
  const [stage, setStage] = useState<Stage>("vocabulary");
  const [wordIndex, setWordIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>("idle");
  const [mastery, setMastery] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [accelerated, setAccelerated] = useState(false);
  const [deepGrammar, setDeepGrammar] = useState(false);

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
    setDeepGrammar(false);
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
              <StackLine role="Supporting bridge" language="Vietnamese" value={currentWord.vietnamese} />
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
              <StackLine role="Supporting bridge" language="Vietnamese" value="Mình đến từ Indiana." />
            </div>
            <p className="contemplative-note wide">The meaning stays stable. Each language reveals a different way of organizing identity and origin.</p>
            <button className="primary-action" onClick={() => resetAnswer("grammar")}>See what changes <span aria-hidden="true">→</span></button>
          </div>
        )}

        {stage === "grammar" && (
          <div className="focus-content grammar-content">
            <p className="eyebrow">{deepGrammar ? "Grammar studio" : "The stack beneath the sentence"}</p>
            <h1 className="grammar-line"><span>Soy</span> de Indiana.</h1>
            {!deepGrammar ? (
              <>
                <div className="grammar-grid language-grammar-grid">
                  <article><span className="grammar-language">Spanish · target</span><strong>soy + de</strong><p><em>Ser</em> changes into <em>soy</em> for “I.” The pronoun <em>yo</em> is optional because the verb already identifies the speaker.</p></article>
                  <article><span className="grammar-language">English · anchor</span><strong>I + am + from</strong><p>English requires the subject and changes <em>be</em> to <em>am</em>. This familiar pattern helps make Spanish conjugation intelligible.</p></article>
                  <article><span className="grammar-language">Vietnamese · supporting bridge</span><strong>mình + đến từ</strong><p>The verb phrase does not conjugate. <em>Đến từ</em> literally carries “come from,” while the pronoun reflects relationship and context.</p></article>
                </div>
                <p className="insight">Spanish and English change the verb. Vietnamese keeps the verb stable. Spanish alone can let the conjugated verb stand without the pronoun.</p>
                <button className="text-action grammar-depth-action" onClick={() => setDeepGrammar(true)}>Go deeper into the grammar</button>
                <button className="primary-action" onClick={() => setStage("transform")}>Build the Spanish <span aria-hidden="true">→</span></button>
              </>
            ) : (
              <>
                <div className="deep-grammar-grid">
                  <article><span>01 · Conjugation</span><strong>ser changes with the person</strong><p><em>Yo soy</em>, <em>tú eres</em>, and <em>él / ella / usted es</em> are forms of one verb. The change is grammatical information, not new vocabulary.</p></article>
                  <article><span>02 · Subject omission</span><strong>soy already contains “I”</strong><p>Spanish pronouns are often omitted when the verb ending makes the subject clear. Use <em>yo</em> when contrast or emphasis matters: <em>Yo soy de Indiana; ella es de Madrid.</em></p></article>
                  <article><span>03 · Ser, not estar</span><strong>origin is treated as identity</strong><p>Spanish uses <em>ser de</em> for where someone is from. <em>Estar</em> describes location or state, but <em>estoy de Indiana</em> does not express origin.</p></article>
                  <article><span>04 · The range of de</span><strong>origin, possession, material</strong><p><em>De</em> can mean “from” or “of”: <em>soy de Indiana</em>, <em>el libro de Ana</em>, <em>una mesa de madera</em>. The relationship is resolved through context.</p></article>
                </div>
                <p className="deep-grammar-summary">English helps you recognize the changing form of “be.” Vietnamese makes the contrast clearer: <em>là</em> stays stable, while Spanish places person directly inside <em>ser</em>.</p>
                <button className="text-action grammar-depth-action" onClick={() => setDeepGrammar(false)}>Return to the lesson view</button>
                <button className="primary-action" onClick={() => { setDeepGrammar(false); setStage("transform"); }}>Build the Spanish <span aria-hidden="true">→</span></button>
              </>
            )}
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
            <button className="text-action edit-languages-action" onClick={onEditLanguages}>Edit language stack</button>
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
        <span>{stage === "complete" ? "Next · Spanish foundations" : `Spanish target · ${profile.native} anchor · ${profile.second ? `${profile.second} bridge (${profile.secondConfidence})` : "native anchor only"}`}</span>
        <span>{mastery ? "Level signal recorded" : "Text-first · No streaks, no scores"}</span>
      </footer>
    </main>
  );
}

function LanguageSetup({ onComplete }: { onComplete: (profile: LanguageProfile) => void }) {
  const [step, setStep] = useState(0);
  const [native, setNative] = useState("English");
  const [second, setSecond] = useState<string | null>("Vietnamese");
  const [secondConfidence, setSecondConfidence] = useState<Confidence>("developing");
  const [additional, setAdditional] = useState<string[]>(["Spanish"]);

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
            <button className="primary-action" onClick={() => onComplete({ native, second, secondConfidence: second ? secondConfidence : null, additional })}>Begin with foundations <span aria-hidden="true">→</span></button>
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
