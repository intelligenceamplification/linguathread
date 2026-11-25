"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InteractiveSentenceModel } from "./interactive-sentence";
import { analyzeXRayScope, languageSentence, xrayLanguages, type LessonForTools, type XRayScope } from "./lesson-tools";
import ListenButton from "./listen-button";
import { speechLanguage } from "./speech";
import { buildXRayAnalysis, xrayLanguagePattern, xrayRecall, xrayRoleLabels, type XRayUnit } from "./xray-analysis";

type Props = { lesson: LessonForTools; showBridge: boolean; model?: InteractiveSentenceModel; initialLanguage?: string };

export function UniversalXRay({ onClose, ...props }: Props & { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);

  return <dialog ref={dialogRef} className="universal-xray" aria-label="Expression X-Ray"
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="inspector-heading">
      <h2>Expression X-Ray</h2>
      <button type="button" autoFocus onClick={onClose} aria-label="Close Expression X-Ray">×</button>
    </div>
    <XRayWorkspace {...props} />
  </dialog>;
}

const views = ["Structure", "Compare", "Practice"] as const;
type View = typeof views[number];

export function XRayWorkspace({ lesson, showBridge, model, initialLanguage = "Spanish" }: Props) {
  const [view, setView] = useState<View>("Structure");
  const [language, setLanguage] = useState(initialLanguage);
  const languages = useMemo(() => xrayLanguages(lesson, showBridge), [lesson, showBridge]);
  const active = languages.find((item) => item.toLowerCase() === language.toLowerCase()) ?? languages[0] ?? "Spanish";
  const analysis = useMemo(() => buildXRayAnalysis(lesson, active, languages, model), [lesson, active, languages, model]);

  return <div className="xray-workspace">
    <div className="xray-switch" role="group" aria-label="X-Ray view">
      {views.map((item) => <button key={item} type="button" aria-pressed={view === item} onClick={() => setView(item)}>{item}</button>)}
    </div>
    {view === "Structure" && <>
      <div className="xray-expression-stack" aria-label="Full expression">
        <FullExpression lesson={lesson} language={active} primary />
        {active !== "English" && <FullExpression lesson={lesson} language="English" />}
      </div>
      <div className="xray-switch xray-languages" role="group" aria-label="X-Ray language">
        {languages.map((item) => <button key={item} type="button" aria-pressed={active === item} onClick={() => setLanguage(item)}>{item}</button>)}
      </div>
      <XRayStructure key={active} lesson={lesson} language={active} {...analysis} />
    </>}
    {view === "Compare" && <XRayComparison lesson={lesson} languages={languages} {...analysis} />}
    {view === "Practice" && <XRayPractice lesson={lesson} active={active} languages={languages} transfer={analysis.editorial.transfer} />}
  </div>;
}

function FullExpression({ lesson, language, primary = false }: { lesson: LessonForTools; language: string; primary?: boolean }) {
  const locale = speechLanguage(language);
  const text = languageSentence(lesson, language);
  return <div className="xray-expression" data-primary={primary}>
    <div><span>{language}{language === "English" ? " · Meaning anchor" : ""}</span><p lang={locale ?? undefined}>{text}</p></div>
    {locale && <ListenButton text={text} language={locale} compact />}
  </div>;
}

function XRayStructure({ lesson, language, units, clauses, scopes, editorial }: Pick<ReturnType<typeof buildXRayAnalysis>, "units" | "clauses" | "scopes" | "editorial"> & {
  lesson: LessonForTools; language: string;
}) {
  const [selection, setSelection] = useState("");
  const [scopeId, setScopeId] = useState("");
  const selected = units.find((unit) => unit.id === selection);
  const scope = scopes.find((item) => item.id === scopeId);
  const lang = speechLanguage(language) ?? undefined;
  const allUnitsCovered = clauses.length > 0 && units.every((unit) =>
    clauses.some((clause) => clause.start <= unit.start && unit.end <= clause.end));
  const groupedUnits = allUnitsCovered ? clauses.map((clause) => ({
    label: clause.label, role: clause.role, units: units.filter((unit) => clause.start <= unit.start && unit.end <= clause.end),
  })) : [{ label: "", role: "unit", units }];
  const pattern = xrayLanguagePattern(lesson, language, units);

  return <>
    <section className="xray-section">
      <h3>How the sentence fits together</h3>
      <div className="xray-architecture">
        {groupedUnits.map((group) => <div key={group.label} className="xray-clause" data-role={group.role}>
          {group.label && <h4>{group.label}</h4>}
          <div className="xray-units">
            {group.units.map((unit) => <button key={unit.id} type="button" className="xray-block" data-role={unit.role}
              aria-pressed={selection === unit.id} onClick={() => { setSelection(selection === unit.id ? "" : unit.id); setScopeId(""); }}>
              <strong lang={lang}>{unit.text}</strong><span>{unit.label}</span>
            </button>)}
          </div>
        </div>)}
      </div>
      {selected && <XRayUnitDetail unit={selected} language={language} />}
      <details className="xray-disclosure">
        <summary>Inspect a word or phrase</summary>
        <label className="xray-scope-field">
          <span>Word or phrase</span>
          <select value={scopeId} onChange={(event) => { setScopeId(event.target.value); setSelection(""); }}>
            <option value="">Choose a word or phrase</option>
            {scopes.map((item) => <option key={item.id} value={item.id}>{item.text}</option>)}
          </select>
        </label>
        {scope && <XRayScopeDetail lesson={lesson} scope={scope} />}
      </details>
    </section>
    <details className="xray-disclosure">
      <summary>Reusable pattern</summary>
      {editorial.pattern && <><p className="xray-pattern">{editorial.pattern.frame}</p><p>{editorial.pattern.explanation}</p></>}
      {(editorial.pattern?.languages[language] ?? pattern.pattern) && <p className="xray-pattern">{editorial.pattern?.languages[language] ?? pattern.pattern}</p>}
      {!editorial.pattern && <>
        {pattern.steps.length > 1 && <ol className="xray-pattern-steps">{pattern.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
        <p>{pattern.explanation}</p>
      </>}
    </details>
  </>;
}

function XRayUnitDetail({ unit, language }: { unit: XRayUnit; language: string }) {
  const detailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    detailRef.current?.scrollIntoView({ block: "nearest" });
  }, [unit.id]);

  return <div ref={detailRef} className="xray-unit-detail" aria-live="polite">
    <h4 lang={speechLanguage(language) ?? undefined}>{unit.text}</h4>
    {unit.role !== "unit" && <p className="xray-role-label">{xrayRoleLabels[unit.role]}</p>}
    {unit.meaning && <p className="xray-pattern">{unit.meaning}</p>}
    {unit.notes.map((note) => <p key={note}>{note}</p>)}
    {!unit.meaning && !unit.notes.length && <p>Read this part in the full expression and its reusable pattern.</p>}
    {unit.comparison && <p>{unit.comparison}</p>}
  </div>;
}

function XRayScopeDetail({ lesson, scope }: { lesson: LessonForTools; scope: XRayScope }) {
  const analysis = analyzeXRayScope(lesson, scope);
  return <div className="xray-unit-detail" aria-live="polite">
    <p className="xray-pattern">{analysis.directMeaning}</p>
    <p>{analysis.syntacticRole}</p>
    <p>{analysis.morphology}</p>
    <p>{analysis.usage}</p>
    {analysis.pronunciation && <p>{analysis.pronunciation}</p>}
    {analysis.transformation && <p>{analysis.transformation}</p>}
  </div>;
}

function XRayComparison({ lesson, languages, units, editorial }: Pick<ReturnType<typeof buildXRayAnalysis>, "units" | "editorial"> & {
  lesson: LessonForTools; languages: string[];
}) {
  const aligned = units.filter((unit) => Object.keys(unit.forms).length > 1);

  return <section className="xray-section">
    <h3>One meaning across languages</h3>
    <div className="xray-comparison" style={{ "--xray-columns": languages.length } as React.CSSProperties}>
      {languages.map((language) => <FullExpression key={language} lesson={lesson} language={language} />)}
    </div>
    {aligned.map((unit) => <details className="xray-disclosure" key={unit.id}>
      <summary>{unit.label === "Expression" ? unit.text : `${unit.label} · ${unit.text}`}</summary>
      <dl className="xray-correspondence">
        {languages.filter((language) => unit.forms[language]).map((language) => <div key={language}>
          <dt>{language}</dt><dd><strong lang={speechLanguage(language) ?? undefined}>{unit.forms[language]}</strong>
            {unit.languageNotes?.[language] && <p>{unit.languageNotes[language]}</p>}
          </dd>
        </div>)}
      </dl>
      {unit.comparison && <p>{unit.comparison}</p>}
    </details>)}
    <details className="xray-disclosure">
      <summary>Compare reusable patterns</summary>
      {editorial.pattern && <p>{editorial.pattern.explanation}</p>}
      <dl className="xray-correspondence">
        {languages.map((language) => {
          const { pattern, explanation } = xrayLanguagePattern(lesson, language);
          const frame = editorial.pattern?.languages[language] ?? pattern;
          return <div key={language}><dt>{language}</dt><dd>{frame && <strong>{frame}</strong>}{!editorial.pattern && <p>{explanation}</p>}</dd></div>;
        })}
      </dl>
    </details>
  </section>;
}

function XRayPractice({ lesson, active, languages, transfer }: {
  lesson: LessonForTools; active: string; languages: string[]; transfer: ReturnType<typeof buildXRayAnalysis>["editorial"]["transfer"];
}) {
  const forms = transfer && languages.every((language) => transfer.forms[language]) ? transfer.forms : null;
  const rounds = xrayRecall(lesson, languages, forms ?? {});
  const [direction, setDirection] = useState(() => Math.max(0, rounds.findIndex((round) => round.from === "English" && round.to === active)));
  const [kind, setKind] = useState<"recall" | "transfer">("recall");
  const round = rounds[direction] ?? rounds[0];
  const practiceLanguage = active === "English" ? languages.find((item) => item !== "English") ?? active : active;

  return <section className="xray-section">
    <h3>{forms ? "Try a variation" : "Recall and reuse"}</h3>
    {forms && round?.from === "English" && <p>{transfer?.context}</p>}
    {!forms && <div className="xray-switch" role="group" aria-label="Practice activity">
      <button type="button" aria-pressed={kind === "recall"} onClick={() => setKind("recall")}>Recall the expression</button>
      <button type="button" aria-pressed={kind === "transfer"} onClick={() => setKind("transfer")}>Make a variation</button>
    </div>}
    {kind === "transfer" ? <div className="xray-exercise">
      <h4>Put yourself in the situation</h4>
      <p>Say something you could use in your own life in {practiceLanguage}. Keep the same structure and change one idea using words you already know.</p>
      <details className="xray-disclosure">
        <summary>Review the pattern after trying</summary>
        <p className="xray-pattern">{xrayLanguagePattern(lesson, practiceLanguage).pattern ?? lesson.skill}</p>
        <p lang={speechLanguage(practiceLanguage) ?? undefined}>{languageSentence(lesson, practiceLanguage)}</p>
      </details>
    </div> : round && <>
      <label className="xray-scope-field">
        <span>Recall direction</span>
        <select value={direction} onChange={(event) => setDirection(Number(event.target.value))}>
          {rounds.map((item, index) => <option key={`${item.from}-${item.to}`} value={index}>{item.from} → {item.to}</option>)}
        </select>
      </label>
      <RecallPrompt key={`${round.from}-${round.to}`} round={round} />
    </>}
  </section>;
}

function RecallPrompt({ round }: { round: ReturnType<typeof xrayRecall>[number] }) {
  const [revealed, setRevealed] = useState(false);
  return <div className="xray-exercise">
    <h4>Say or write it in {round.to}</h4>
    <p className="xray-prompt" lang={speechLanguage(round.from) ?? undefined}>{round.prompt}</p>
    <textarea rows={2} aria-label={`Your answer in ${round.to}`} lang={speechLanguage(round.to) ?? undefined}
      autoComplete="off" spellCheck={false} placeholder="Your answer (optional)" />
    <button className="xray-reveal" type="button" aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? "Hide model answer" : "Reveal model answer"}</button>
    {revealed && <div className="xray-unit-detail" aria-live="polite">
      <p lang={speechLanguage(round.to) ?? undefined}>{round.answer}</p>
      <p>Check whether your version preserves the meaning and uses the pattern naturally.</p>
    </div>}
  </div>;
}
