"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeXRayScope, type LessonForTools, type TranslationLanguage, resolveXRayTokenScope, xrayLanguages, xrayScopes, xraySentenceBreakdown } from "./lesson-tools";

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
  const sentenceBreakdown = selected?.kind === "sentence" ? xraySentenceBreakdown(lesson, activeLanguage) : [];

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
    <h2>See how this meaning is built.</h2>
    <p className="xray-intro">Choose a word, phrase, or the complete sentence.</p>
    <div className="xray-language-tabs" role="tablist" aria-label="X-Ray language">
      {languages.map((item) => <button key={item} role="tab" aria-selected={activeLanguage === item} className={activeLanguage === item ? "selected" : ""} onClick={() => { setLanguage(item); setScopeId(xrayScopes(lesson, item)[0]?.id || ""); }}>{item}</button>)}
    </div>
    <div className="xray-sentence" aria-label={`${activeLanguage} sentence selection`}>
      {words.map((word) => {
        const isSelected = selected?.tokenStart === word.tokenStart && selected?.tokenEnd === word.tokenEnd;
        const isWithinSelectedPhrase = selected && selected.tokenStart <= word.tokenStart && selected.tokenEnd >= word.tokenEnd;
        return <button key={word.id} className={isSelected ? "selected" : isWithinSelectedPhrase ? "in-scope" : ""} aria-pressed={isSelected} onClick={() => selectScope(resolveXRayTokenScope(lesson, activeLanguage, word.tokenStart)?.id || word.id)}>{word.text}</button>;
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
      <p className="xray-kind">{activeLanguage} · {analysis.scope === "sentence" ? "complete sentence" : analysis.interpretation === "phrase" ? "phrase" : analysis.interpretation === "component" ? "phrase component" : "word"}</p>
      <XRaySection title="Meaning"><p className="xray-leading-meaning">{analysis.directMeaning}</p>{analysis.contextualMeaning !== analysis.directMeaning && <p>{analysis.contextualMeaning}</p>}</XRaySection>
      {sentenceBreakdown.length > 0 && <XRaySection title="Complete grammatical breakdown"><div className="xray-breakdown">{sentenceBreakdown.map((scope) => {
        const item = analyzeXRayScope(lesson, scope);
        return <button key={scope.id} onClick={() => selectScope(scope.id)}><strong>{scope.text}</strong><span>{item.partOfSpeech}</span><p>{item.directMeaning}</p></button>;
      })}</div></XRaySection>}
      <XRaySection title="How it works"><dl><InfoRow label="Base form" value={analysis.baseForm} /><InfoRow label="Grammar" value={`${analysis.partOfSpeech}. ${analysis.morphology}`} /><InfoRow label="Role" value={analysis.syntacticRole} />{analysis.pronunciation && <InfoRow label="Pronunciation" value={analysis.pronunciation} />}</dl><p>{analysis.structure}</p></XRaySection>
      <XRaySection title="In this sentence"><p>{analysis.relationship}</p><p>{analysis.usage}</p></XRaySection>
      {(analysis.transformation || analysis.contrast) && <XRaySection title="Compare and transform">{analysis.transformation && <p>{analysis.transformation}</p>}<p>{analysis.contrast}</p></XRaySection>}
    </div>}
  </aside>;
}

function XRaySection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="inspector-section"><h3>{title}</h3>{children}</section>;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
