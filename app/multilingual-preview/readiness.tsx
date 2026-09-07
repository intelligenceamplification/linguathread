"use client";
import { foundationContent, foundationInstructions, foundationObjectives, languageInfo, type FoundationLanguage } from "../multilingual-foundation";
import { advanceLiteracy, assessLiteracy, beginLiteracy, emptyLiteracy, literacyCounts, type LiteracySession } from "./literacy-session";
import { literacyCopy } from "./literacy-copy";
import ListenButton from "../listen-button";

export default function Readiness({ language, anchor, session, onChange, onReady }: {
 language: FoundationLanguage; anchor: FoundationLanguage; session: LiteracySession;
 onChange: (session: LiteracySession) => void; onReady: () => void;
}) {
 const t = literacyCopy(anchor);
 const objective = foundationObjectives[session.index];
 const counts = literacyCounts(session);
 const target = <span lang={language} dir={language === "ar" ? "rtl" : "ltr"}>{foundationContent[language][objective].text}</span>;
 const anchorText = <span lang={anchor} dir={anchor === "ar" ? "rtl" : "ltr"}>{foundationContent[anchor][objective].text}</span>;
 const check = () => onChange(assessLiteracy(session, language));
 return <aside lang={anchor} dir={anchor === "ar" ? "rtl" : "ltr"} aria-label={t.title}>
  <p className="eyebrow"><bdi>{languageInfo(language).native}</bdi></p>
  <h2>{session.phase === "summary" ? t.summary : t.title}</h2>
  <p className="pilot-notice">{t.limit}</p>
  {session.phase === "choose" ? <div className="readiness-choices">
   <p>{t.intro}</p>
   <button className="primary-action" onClick={() => onChange(beginLiteracy("foundations"))}>{t.start}</button>
   <button className="quiet-action" onClick={() => onChange(beginLiteracy("check"))}>{t.check}</button>
  </div> : session.phase === "summary" ? <>
   <dl className="literacy-results">
    <div><dt>{t.reading}</dt><dd>{counts.recognition} / 4</dd></div>
    <div><dt>{t.writing}</dt><dd>{counts.writing} / 4</dd></div>
    <div><dt>{t.supported}</dt><dd>{counts.supportedRecognition + counts.supportedWriting} / 8</dd></div>
   </dl>
   <button className="primary-action" onClick={onReady}>{t.return}</button>
  </> : <>
   <p className="eyebrow">{session.index + 1} / 4</p>
   {session.phase === "study" ? <>
    <p>{t.study}</p><p className="pilot-expression">{target}</p><ListenButton text={foundationContent[language][objective].text} language={language}/><p>{anchorText}</p>
   </> : session.phase === "recognize" ? <>
   <p>{t.recognize}</p><p className="pilot-expression">{target}</p><ListenButton text={foundationContent[language][objective].text} language={language}/>
    <div className="readiness-choices">{foundationObjectives.map(choice => <button className="quiet-action" key={choice} disabled={session.feedback === "correct"} onClick={() => onChange(assessLiteracy(session, language, choice))}>{foundationContent[anchor][choice].text}</button>)}</div>
   </> : <>
    <p>{t.write}</p><p>{anchorText}</p>
    <fieldset className="literacy-input-method"><legend>{t.inputNote}</legend>
     <label><input type="radio" name={language} checked={session.input === "typed"} onChange={() => onChange({ ...session, input: "typed", feedback: "idle" })}/>{t.typed}</label>
     <label><input type="radio" name={language} checked={session.input === "assisted"} onChange={() => onChange({ ...session, input: "assisted", revealed: true, feedback: "idle" })}/>{t.assisted}</label>
    </fieldset>
    <details><summary>{t.keyboard}</summary><p><a href="https://support.apple.com/guide/iphone/add-or-change-keyboards-iph73b71eb/ios" target="_blank" rel="noreferrer">iPhone</a> · <a href="https://support.google.com/gboard/answer/7068494?hl=en" target="_blank" rel="noreferrer">Android · Gboard</a></p></details>
    {session.revealed && <div className="pilot-model"><p>{target}</p><ListenButton text={foundationContent[language][objective].text} language={language}/></div>}
    <input className="answer-field" aria-label={t.write} lang={language} dir={language === "ar" ? "rtl" : "ltr"} autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={2000} value={session.answer} onChange={e => onChange({ ...session, answer: e.target.value, feedback: "idle" })} onKeyDown={e => { if (e.key === "Enter" && !e.nativeEvent.isComposing && session.answer.trim()) check(); }}/>
    {session.feedback !== "correct" && <button className="primary-action" disabled={!session.answer.trim()} onClick={check}>{foundationInstructions[anchor][2]}</button>}
    {!session.revealed && session.feedback !== "correct" && <button className="text-action" onClick={() => onChange({ ...session, revealed: true })}>{t.model}</button>}
   </>}
   <p role="status">{session.feedback === "correct" ? t.correct : session.feedback === "retry" ? t.retry : "\u00a0"}</p>
   {(session.phase === "study" || session.feedback === "correct") && <button className="primary-action" onClick={() => onChange(advanceLiteracy(session))}>{t.continue}</button>}
  </>}
  {session.phase !== "choose" && <button className="text-action" onClick={() => onChange(emptyLiteracy())}>{t.chooseAgain}</button>}
 </aside>;
}
