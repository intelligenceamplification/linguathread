"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeXRayScope, type LessonForTools, type TranslationLanguage, xrayScopes } from "./lesson-tools";

export function UniversalXRay({ lesson, showBridge, onClose }: { lesson: LessonForTools; showBridge: boolean; onClose: () => void }) {
  const [language, setLanguage] = useState<TranslationLanguage>("Spanish");
  const [scopeId, setScopeId] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const languages = showBridge ? ["Spanish", "English", "Vietnamese"] as TranslationLanguage[] : ["Spanish", "English"] as TranslationLanguage[];
  const scopes = xrayScopes(lesson, language);
  const selected = scopes.find((scope) => scope.id === scopeId) || scopes[0];
  const analysis = selected && analyzeXRayScope(lesson, selected);

  useEffect(() => {
    closeRef.current?.focus();
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return <aside className="universal-xray" role="dialog" aria-modal="true" aria-label="Language X-Ray">
    <div className="inspector-heading"><span>Language X-Ray</span><button ref={closeRef} onClick={onClose} aria-label="Close Language X-Ray">×</button></div>
    <h2>Examine one part of the meaning.</h2>
    <p className="xray-intro">Choose one word, one phrase, or the whole sentence. The lesson remains where it is.</p>
    <div className="xray-language-tabs" role="tablist" aria-label="X-Ray language">
      {languages.map((item) => <button key={item} role="tab" aria-selected={language === item} className={language === item ? "selected" : ""} onClick={() => { setLanguage(item); setScopeId(xrayScopes(lesson, item)[0]?.id || ""); }}>{item}</button>)}
    </div>
    <label className="xray-scope-field">
      <span>Selected scope</span>
      <select value={selected?.id || ""} onChange={(event) => setScopeId(event.target.value)}>
        {scopes.map((scope) => <option key={scope.id} value={scope.id}>{scope.kind === "sentence" ? "Whole sentence" : scope.kind === "phrase" ? `Phrase: ${scope.text}` : `Word: ${scope.text}`}</option>)}
      </select>
    </label>
    {analysis && <div className="xray-analysis">
      <h3>{analysis.title}</h3>
      <p className="xray-kind">{analysis.scope} analysis</p>
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
