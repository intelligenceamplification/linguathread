"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CrossLanguageMapping, InteractiveSentenceModel, SentenceLanguage, SentenceRelationship, SentenceUnit } from "./interactive-sentence";
import { analyzeXRayScope, type LessonForTools, resolveXRayTokenScope, type TranslationLanguage, type XRayAnalysis, type XRayScope, xrayScopes, xraySentenceBreakdown } from "./lesson-tools";

type Mode = "reading" | "changes" | "xray";
type Selection = { kind: "unit"; unit: SentenceUnit } | { kind: "xray"; scope: XRayScope; analysis: XRayAnalysis } | { kind: "relationship"; relationship: SentenceRelationship } | { kind: "mapping"; mapping: CrossLanguageMapping } | null;

const toolLanguage = (language: SentenceLanguage): TranslationLanguage => language === "spanish" ? "Spanish" : language === "english" ? "English" : language === "vietnamese" ? "Vietnamese" : language;

export function InteractiveSentence({ model, lesson, onContinue, showBridge }: { model: InteractiveSentenceModel; lesson: LessonForTools; onContinue: () => void; showBridge: boolean }) {
  const [language, setLanguage] = useState<SentenceLanguage>("spanish");
  const [mode, setMode] = useState<Mode>("reading");
  const [selection, setSelection] = useState<Selection>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const availableRealizations = model.realizations.filter((item) => showBridge || item.role !== "bridge");
  const activeLanguage = !showBridge && model.realizations.find((item) => item.language === language)?.role === "bridge" ? availableRealizations[0]?.language || language : language;
  const realization = availableRealizations.find((item) => item.language === activeLanguage) || availableRealizations[0];
  const activeToolLanguage = toolLanguage(activeLanguage);
  const activeXRayScopes = mode === "xray" ? xrayScopes(lesson, activeToolLanguage) : [];
  const xrayWords = activeXRayScopes.filter((scope) => scope.kind === "word");
  const availableMappings = model.mappings.filter((mapping) => showBridge || (model.realizations.find((item) => item.language === mapping.from.language)?.role !== "bridge" && model.realizations.find((item) => item.language === mapping.to.language)?.role !== "bridge"));
  const xrayLabels = realization ? [...new Set(realization.units.map((unit) => unit.label).filter((label): label is string => Boolean(label)))] : [];

  function selectUnit(unit: SentenceUnit, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setSelection({ kind: "unit", unit });
  }

  function selectXRayScope(scope: XRayScope, trigger?: HTMLButtonElement) {
    if (trigger) triggerRef.current = trigger;
    setSelection({ kind: "xray", scope, analysis: analyzeXRayScope(lesson, scope) });
  }

  const closeInspector = useCallback(() => {
    setSelection(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") closeInspector(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [closeInspector]);

  const relationships = selection?.kind === "unit"
    ? model.relationships.filter((relationship) => relationship.unitIds.includes(selection.unit.id))
    : [];

  return (
    <div className="interactive-sentence" data-mode={mode}>
      <p className="eyebrow">One meaning · three structures</p>
      <p className="sentence-meaning">{model.meaning}</p>

      <div className="sentence-controls" aria-label="Sentence exploration controls">
        {(["reading", "changes", "xray"] as Mode[]).map((item) => (
          <button key={item} className={mode === item ? "selected" : ""} aria-pressed={mode === item} onClick={() => { setMode(item); closeInspector(); }}>
            {item === "reading" ? "Read naturally" : item === "changes" ? "See what changes" : "Language X-Ray"}
          </button>
        ))}
      </div>

      <div className="language-switcher" role="tablist" aria-label="Sentence language">
        {availableRealizations.map((item) => {
          return <button key={item.language} role="tab" aria-selected={activeLanguage === item.language} className={activeLanguage === item.language ? "selected" : ""} onClick={() => { setLanguage(item.language); closeInspector(); }}>{item.label}</button>;
        })}
      </div>

      <div className="anatomy-layout">
        <section className="sentence-reading" aria-label={realization ? `${realization.label} sentence` : "Sentence unavailable"}>
          {!realization ? <p className="instruction">This sentence is being prepared. Continue with the lesson while its anatomy is completed.</p> : <>
          <p className="anatomy-language-label">{realization.label}</p>
          <p className="anatomy-sentence">
            {mode === "xray" ? xrayWords.map((word, index) => {
              const selectedScope = selection?.kind === "xray" ? selection.scope : null;
              const selected = selectedScope?.tokenStart === word.tokenStart && selectedScope?.tokenEnd === word.tokenEnd;
              const inScope = selectedScope && selectedScope.tokenStart <= word.tokenStart && selectedScope.tokenEnd >= word.tokenEnd;
              return <button key={word.id} className={`sentence-unit ${selected ? "selected" : inScope ? "in-scope" : ""}`} aria-pressed={Boolean(selected)} data-follows-word={index < xrayWords.length - 1} onClick={(event) => {
                const scope = resolveXRayTokenScope(lesson, activeToolLanguage, word.tokenStart) || word;
                selectXRayScope(scope, event.currentTarget);
              }}>{word.text}</button>;
            }) : realization.units.map((unit, index) => <button key={unit.id} className={`sentence-unit ${selection?.kind === "unit" && selection.unit.id === unit.id ? "selected" : ""}`} aria-pressed={selection?.kind === "unit" && selection.unit.id === unit.id} data-follows-word={index < realization.units.length - 1} onClick={(event) => selectUnit(unit, event.currentTarget)}>{unit.text}</button>)}
          </p>
          {mode === "xray" && <label className="xray-scope-field anatomy-xray-scope"><span>Word, phrase, or full sentence</span><select value={selection?.kind === "xray" ? selection.scope.id : ""} onChange={(event) => { const scope = activeXRayScopes.find((item) => item.id === event.target.value); if (scope) selectXRayScope(scope); }}><option value="" disabled>Choose a scope</option>{activeXRayScopes.map((scope) => <option key={scope.id} value={scope.id}>{scope.kind === "sentence" ? "Complete sentence breakdown" : scope.kind === "phrase" ? `Phrase: ${scope.text}` : `Word: ${scope.text}`}</option>)}</select></label>}
          {mode === "xray" && xrayLabels.length > 0 && <div className="xray-key" aria-label="Language X-Ray categories">{xrayLabels.map((label) => <span key={label}>{label}</span>)}</div>}
          {mode === "changes" && <div className="mapping-list" aria-label="Cross-language transformations">{availableMappings.length > 0 ? availableMappings.map((mapping) => <button key={mapping.id} className={selection?.kind === "mapping" && selection.mapping.id === mapping.id ? "selected" : ""} onClick={(event) => { triggerRef.current = event.currentTarget; setSelection({ kind: "mapping", mapping }); }}><span>{mapping.kind}</span>{mapping.label}</button>) : <p className="instruction">This comparison has not been authored yet.</p>}</div>}
          {mode !== "changes" && <div className="relationship-list" aria-label="Sentence relationships">{model.relationships.filter((relationship) => relationship.languages.includes(activeLanguage)).map((relationship) => <button key={relationship.id} onClick={(event) => { triggerRef.current = event.currentTarget; setSelection({ kind: "relationship", relationship }); }}><span>Relationship</span>{relationship.label}</button>)}</div>}
          </>}
        </section>

        {selection && <Inspector selection={selection} relationships={relationships} model={model} lesson={lesson} onXRayScope={(scope) => selectXRayScope(scope)} onRelationship={(relationship) => setSelection({ kind: "relationship", relationship })} onClose={closeInspector} />}
      </div>

      <div className="anatomy-stack" aria-label="Other expressions of the same meaning">
        {availableRealizations.filter((item) => item.language !== activeLanguage).map((item) => <p key={item.language}><span>{item.label}</span>{item.sentence}</p>)}
      </div>
      <button className="primary-action" onClick={onContinue}>Continue with the lesson <span aria-hidden="true">→</span></button>
    </div>
  );
}

function Inspector({ selection, relationships, model, lesson, onXRayScope, onRelationship, onClose }: { selection: Exclude<Selection, null>; relationships: SentenceRelationship[]; model: InteractiveSentenceModel; lesson: LessonForTools; onXRayScope: (scope: XRayScope) => void; onRelationship: (relationship: SentenceRelationship) => void; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeButtonRef.current?.focus(); }, []);
  const title = selection.kind === "unit" ? selection.unit.text : selection.kind === "xray" ? selection.analysis.title : selection.kind === "relationship" ? selection.relationship.label : selection.mapping.label;
  const body = selection.kind === "unit" ? <>
    <InspectorSection title="Meaning"><p>{selection.unit.meaning}</p>{selection.unit.literal && <p><span>Literal</span>{selection.unit.literal}</p>}{selection.unit.structural && <p><span>Structure</span>{selection.unit.structural}</p>}{selection.unit.natural && <p><span>Natural</span>{selection.unit.natural}</p>}</InspectorSection>
    <InspectorSection title="Why this form appears"><p>{selection.unit.why}</p></InspectorSection>
    {selection.unit.grammar.length > 0 && <InspectorSection title="In this sentence"><dl>{selection.unit.grammar.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></InspectorSection>}
    {relationships.length > 0 && <InspectorSection title="Connected here"><div className="inspector-actions">{relationships.map((relationship) => <button key={relationship.id} onClick={() => onRelationship(relationship)}>{relationship.label}</button>)}</div></InspectorSection>}
  </> : selection.kind === "xray" ? <XRayInspectorBody selection={selection} lesson={lesson} onXRayScope={onXRayScope} /> : selection.kind === "relationship" ? <InspectorSection title="Relationship"><p>{selection.relationship.explanation}</p></InspectorSection> : <>
    <InspectorSection title="What changes"><p>{selection.mapping.explanation}</p></InspectorSection>
    {selection.mapping.reusablePattern && <InspectorSection title="Reusable pattern"><p>{selection.mapping.reusablePattern}</p></InspectorSection>}
  </>;
  return <aside className="sentence-inspector" role="region" aria-label={`${title} explanation`}>
    <div className="inspector-heading"><span>{selection.kind === "mapping" ? "Cross-language mapping" : selection.kind === "relationship" ? "Sentence relationship" : selection.kind === "xray" ? "Language X-Ray" : "Sentence unit"}</span><button ref={closeButtonRef} onClick={onClose} aria-label="Close explanation">×</button></div>
    <h2>{title}</h2>{body}
    {selection.kind !== "relationship" && <InspectorSection title="Related patterns"><ul>{model.relatedPatterns.map((pattern) => <li key={pattern.sentence}><strong>{pattern.sentence}</strong><span>{pattern.explanation}</span></li>)}</ul></InspectorSection>}
  </aside>;
}

function XRayInspectorBody({ selection, lesson, onXRayScope }: { selection: Extract<Exclude<Selection, null>, { kind: "xray" }>; lesson: LessonForTools; onXRayScope: (scope: XRayScope) => void }) {
  const { analysis, scope } = selection;
  const breakdown = scope.kind === "sentence" ? xraySentenceBreakdown(lesson, scope.language) : [];
  return <>
    <p className="xray-kind">{analysis.interpretation === "standalone" ? "Standalone term" : analysis.interpretation === "phrase" ? "Phrase-level expression" : analysis.interpretation === "component" ? "Component within a phrase" : "Context-dependent selection"} · {analysis.scope} analysis</p>
    <InspectorSection title="Meaning"><p>{analysis.directMeaning}</p><p>{analysis.contextualMeaning}</p></InspectorSection>
    {breakdown.length > 0 && <InspectorSection title="Complete grammatical breakdown"><div className="xray-breakdown">{breakdown.map((item) => { const itemAnalysis = analyzeXRayScope(lesson, item); return <button key={item.id} onClick={() => onXRayScope(item)}><strong>{item.text}</strong><span>{itemAnalysis.partOfSpeech}</span><p>{itemAnalysis.directMeaning}</p></button>; })}</div></InspectorSection>}
    <InspectorSection title="Form"><dl><div><dt>Base form</dt><dd>{analysis.baseForm}</dd></div><div><dt>Morphology</dt><dd>{analysis.morphology}</dd></div><div><dt>Part of speech</dt><dd>{analysis.partOfSpeech}</dd></div><div><dt>Role</dt><dd>{analysis.syntacticRole}</dd></div></dl></InspectorSection>
    <InspectorSection title="Structure"><p>{analysis.structure}</p></InspectorSection>
    <InspectorSection title="Use and nuance"><p>{analysis.usage}</p><p>{analysis.contrast}</p></InspectorSection>
    <InspectorSection title="In the whole sentence"><p>{analysis.relationship}</p></InspectorSection>
  </>;
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="inspector-section"><h3>{title}</h3>{children}</section>;
}
