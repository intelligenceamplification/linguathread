"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeXRayScope, type LessonForTools, type TranslationLanguage, xrayLanguages, xrayScopes } from "./lesson-tools";

export function UniversalXRay({ lesson, showBridge, onClose }: { lesson: LessonForTools; showBridge: boolean; onClose: () => void }) {
  const [language, setLanguage] = useState<TranslationLanguage>("Spanish");
  const [scopeId, setScopeId] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const languages = xrayLanguages(lesson, showBridge);
  const activeLanguage = languages.includes(language) ? language : languages[0] || "Spanish";
  const scopes = xrayScopes(lesson, activeLanguage);
  const selected = scopes.find((scope) => scope.id === scopeId) || scopes[0];
  const analysis = selected && analyzeXRayScope(lesson, selected);
  const words = scopes.filter((scope) => scope.kind === "word");

  function selectScope(scopeId: string) {
    setScopeId(scopeId);
  }

  useEffect(() => {
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return <aside className="universal-xray" role="dialog" aria-modal="true" aria-label="Language X-Ray">
    <div className="inspector-heading"><span>Language X-Ray</span><button ref={closeRef} onClick={onClose} aria-label="Close Language X-Ray">×</button></div>
    <h2>Examine one part of the meaning.</h2>
    <p className="xray-intro">Choose one word, one phrase, or the whole sentence. Every language in the stack is equally available here.</p>
    <div className="xray-language-tabs" role="tablist" aria-label="X-Ray language">
      {languages.map((item) => <button key={item} role="tab" aria-selected={activeLanguage === item} className={activeLanguage === item ? "selected" : ""} onClick={() => { setLanguage(item); setScopeId(xrayScopes(lesson, item)[0]?.id || ""); }}>{item}</button>)}
    </div>
    <div className="xray-sentence" aria-label={`${activeLanguage} sentence selection`}>
      {words.map((word) => {
        const isSelected = selected?.tokenStart === word.tokenStart && selected?.tokenEnd === word.tokenEnd;
        const isWithinSelectedPhrase = selected && selected.tokenStart <= word.tokenStart && selected.tokenEnd >= word.tokenEnd;
        return <button key={word.id} className={isSelected ? "selected" : isWithinSelectedPhrase ? "in-scope" : ""} aria-pressed={isSelected} onClick={() => selectScope(word.id)}>{word.text}</button>;
      })}
    </div>
    <label className="xray-scope-field">
      <span>Word, phrase, or full sentence</span>
      <select value={selected?.id || ""} onChange={(event) => selectScope(event.target.value)}>
        {scopes.map((scope) => <option key={scope.id} value={scope.id}>{scope.kind === "sentence" ? "Whole sentence" : scope.kind === "phrase" ? `Phrase: ${scope.text}` : `Word: ${scope.text}`}</option>)}
      </select>
    </label>
    {analysis && <div className="xray-analysis">
      <h3>{analysis.title}</h3>
      <p className="xray-kind">{analysis.interpretation === "standalone" ? "Standalone term" : analysis.interpretation === "phrase" ? "Phrase-level expression" : analysis.interpretation === "component" ? "Component within a phrase" : "Context-dependent selection"} · {analysis.scope} analysis</p>
      <XRaySection title="Meaning"><p>{analysis.directMeaning}</p><p>{analysis.contextualMeaning}</p></XRaySection>
      <XRaySection title="Form"><dl><div><dt>Base form</dt><dd>{analysis.baseForm}</dd></div><div><dt>Morphology</dt><dd>{analysis.morphology}</dd></div><div><dt>Part of speech</dt><dd>{analysis.partOfSpeech}</dd></div><div><dt>Role</dt><dd>{analysis.syntacticRole}</dd></div></dl></XRaySection>
      <XRaySection title="Structure"><p>{analysis.structure}</p></XRaySection>
      <XRaySection title="Use and nuance"><p>{analysis.usage}</p><p>{analysis.contrast}</p></XRaySection>
      <XRaySection title="In the whole sentence"><p>{analysis.relationship}</p></XRaySection>
    </div>}
  </aside>;
}

function XRaySection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="inspector-section"><h3>{title}</h3>{children}</section>;
}
