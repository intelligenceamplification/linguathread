"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CrossLanguageMapping, InteractiveSentenceModel, SentenceLanguage, SentenceRelationship, SentenceUnit } from "./interactive-sentence";

type Mode = "reading" | "changes" | "xray";
type Selection = { kind: "unit"; unit: SentenceUnit } | { kind: "relationship"; relationship: SentenceRelationship } | { kind: "mapping"; mapping: CrossLanguageMapping } | null;

export function InteractiveSentence({ model, onContinue, showBridge }: { model: InteractiveSentenceModel; onContinue: () => void; showBridge: boolean }) {
  const [language, setLanguage] = useState<SentenceLanguage>("spanish");
  const [mode, setMode] = useState<Mode>("reading");
  const [selection, setSelection] = useState<Selection>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const availableRealizations = model.realizations.filter((item) => showBridge || item.role !== "bridge");
  const activeLanguage = !showBridge && model.realizations.find((item) => item.language === language)?.role === "bridge" ? availableRealizations[0]?.language || language : language;
  const realization = availableRealizations.find((item) => item.language === activeLanguage) || availableRealizations[0];
  const availableMappings = model.mappings.filter((mapping) => showBridge || (model.realizations.find((item) => item.language === mapping.from.language)?.role !== "bridge" && model.realizations.find((item) => item.language === mapping.to.language)?.role !== "bridge"));

  function selectUnit(unit: SentenceUnit, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setSelection({ kind: "unit", unit });
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
          <button key={item} className={mode === item ? "selected" : ""} aria-pressed={mode === item} onClick={() => { setMode(item); if (item === "reading") closeInspector(); }}>
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
            {realization.units.map((unit, index) => <button key={unit.id} className={`sentence-unit ${selection?.kind === "unit" && selection.unit.id === unit.id ? "selected" : ""}`} aria-pressed={selection?.kind === "unit" && selection.unit.id === unit.id} data-follows-word={index < realization.units.length - 1} onClick={(event) => selectUnit(unit, event.currentTarget)}>{unit.text}</button>)}
          </p>
          {mode === "xray" && <div className="xray-key" aria-label="Language X-Ray categories">{realization.units.map((unit) => <span key={unit.id}>{unit.label}</span>)}</div>}
          {mode === "changes" && <div className="mapping-list" aria-label="Cross-language transformations">{availableMappings.length > 0 ? availableMappings.map((mapping) => <button key={mapping.id} className={selection?.kind === "mapping" && selection.mapping.id === mapping.id ? "selected" : ""} onClick={(event) => { triggerRef.current = event.currentTarget; setSelection({ kind: "mapping", mapping }); }}><span>{mapping.kind}</span>{mapping.label}</button>) : <p className="instruction">This comparison has not been authored yet.</p>}</div>}
          {mode !== "changes" && <div className="relationship-list" aria-label="Sentence relationships">{model.relationships.filter((relationship) => relationship.languages.includes(activeLanguage)).map((relationship) => <button key={relationship.id} onClick={(event) => { triggerRef.current = event.currentTarget; setSelection({ kind: "relationship", relationship }); }}><span>Relationship</span>{relationship.label}</button>)}</div>}
          </>}
        </section>

        {selection && <Inspector selection={selection} relationships={relationships} model={model} onRelationship={(relationship) => setSelection({ kind: "relationship", relationship })} onClose={closeInspector} />}
      </div>

      <div className="anatomy-stack" aria-label="Other expressions of the same meaning">
        {availableRealizations.filter((item) => item.language !== activeLanguage).map((item) => <p key={item.language}><span>{item.label}</span>{item.sentence}</p>)}
      </div>
      <button className="primary-action" onClick={onContinue}>Continue with the lesson <span aria-hidden="true">→</span></button>
    </div>
  );
}

function Inspector({ selection, relationships, model, onRelationship, onClose }: { selection: Exclude<Selection, null>; relationships: SentenceRelationship[]; model: InteractiveSentenceModel; onRelationship: (relationship: SentenceRelationship) => void; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeButtonRef.current?.focus(); }, []);
  const title = selection.kind === "unit" ? selection.unit.text : selection.kind === "relationship" ? selection.relationship.label : selection.mapping.label;
  const body = selection.kind === "unit" ? <>
    <InspectorSection title="Meaning"><p>{selection.unit.meaning}</p>{selection.unit.literal && <p><span>Literal</span>{selection.unit.literal}</p>}{selection.unit.structural && <p><span>Structure</span>{selection.unit.structural}</p>}{selection.unit.natural && <p><span>Natural</span>{selection.unit.natural}</p>}</InspectorSection>
    <InspectorSection title="Why this form appears"><p>{selection.unit.why}</p></InspectorSection>
    {selection.unit.grammar.length > 0 && <InspectorSection title="In this sentence"><dl>{selection.unit.grammar.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></InspectorSection>}
    {relationships.length > 0 && <InspectorSection title="Connected here"><div className="inspector-actions">{relationships.map((relationship) => <button key={relationship.id} onClick={() => onRelationship(relationship)}>{relationship.label}</button>)}</div></InspectorSection>}
  </> : selection.kind === "relationship" ? <InspectorSection title="Relationship"><p>{selection.relationship.explanation}</p></InspectorSection> : <>
    <InspectorSection title="What changes"><p>{selection.mapping.explanation}</p></InspectorSection>
    {selection.mapping.reusablePattern && <InspectorSection title="Reusable pattern"><p>{selection.mapping.reusablePattern}</p></InspectorSection>}
  </>;
  return <aside className="sentence-inspector" role="region" aria-label={`${title} explanation`}>
    <div className="inspector-heading"><span>{selection.kind === "mapping" ? "Cross-language mapping" : selection.kind === "relationship" ? "Sentence relationship" : "Sentence unit"}</span><button ref={closeButtonRef} onClick={onClose} aria-label="Close explanation">×</button></div>
    <h2>{title}</h2>{body}
    {selection.kind !== "relationship" && <InspectorSection title="Related patterns"><ul>{model.relatedPatterns.map((pattern) => <li key={pattern.sentence}><strong>{pattern.sentence}</strong><span>{pattern.explanation}</span></li>)}</ul></InspectorSection>}
  </aside>;
}

function InspectorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="inspector-section"><h3>{title}</h3>{children}</section>;
}
