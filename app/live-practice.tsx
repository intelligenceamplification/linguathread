"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { chatGPTDestination, copyPracticeContext, openNativeChatGPT } from "./live-practice-handoff";
import "./live-practice.css";

type PracticeState = "lesson" | "preparing" | "ready" | "error";

export function LivePractice({ children, prepareContext, languages, focus }: { children: ReactNode; prepareContext: () => string; languages: string[]; focus: string }) {
  const [state, setState] = useState<PracticeState>("lesson");
  const [context, setContext] = useState("");
  const [error, setError] = useState("");
  const [copying, setCopying] = useState(false);
  const [copyNote, setCopyNote] = useState("");
  const generation = useRef(0);
  const startRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => { generation.current += 1; }, []);
  useEffect(() => { if (state !== "lesson") headingRef.current?.focus(); }, [state]);

  async function prepare() {
    const current = ++generation.current;
    setState("preparing");
    setError("");
    setCopyNote("");
    let prompt = "";
    try {
      // Construct and request the clipboard inside the original user gesture.
      prompt = prepareContext();
      if (!prompt.trim()) throw new Error("Missing lesson context");
      setContext(prompt);
      await copyPracticeContext(prompt);
      if (generation.current === current) setState("ready");
    } catch {
      if (generation.current !== current) return;
      setError(prompt ? "Your context is ready, but it couldn’t be copied. Try copying again." : "We couldn’t prepare this lesson’s context. Please try again.");
      setState("error");
    }
  }

  function returnToLesson() {
    generation.current += 1;
    setState("lesson");
    setContext("");
    setCopying(false);
    requestAnimationFrame(() => startRef.current?.focus());
  }

  async function copyAgain() {
    const current = generation.current;
    setCopying(true);
    setCopyNote("");
    try {
      await copyPracticeContext(context);
      if (generation.current === current) { setState("ready"); setCopyNote("Copied again."); }
    } catch {
      if (generation.current === current) setCopyNote("Couldn’t copy. Please try again.");
    } finally { if (generation.current === current) setCopying(false); }
  }

  return <div className="live-practice-flow">
    <div hidden={state !== "lesson"}>{children}</div>
    {state === "lesson" ? <aside className="live-practice-entry" aria-label="Live Practice">
      <PracticeMark />
      <div><p className="eyebrow">Live Practice</p><p>Continue this lesson through conversation when you’re ready.</p>
        <button ref={startRef} className="primary-action" onClick={prepare}>Start Live Practice <span aria-hidden="true">→</span></button>
      </div>
    </aside> : <div className="focus-content live-practice-content" aria-busy={state === "preparing"}>
      <p className="eyebrow">Live Practice{state === "ready" && languages.length ? ` · ${languages.join(" + ")}` : ""}</p>
      <h1 ref={headingRef} tabIndex={-1} className="exercise-title">{state === "preparing" ? "Preparing your practice session…" : state === "ready" ? "Your practice context is ready." : "Let’s try that again."}</h1>
      <p className="instruction" role="status">{state === "preparing" ? "Preparing context from your current lesson." : state === "ready" ? "Your lesson context has been copied." : error}</p>
      {state !== "error" && <div className="practice-mark-wash" aria-hidden="true"><PracticeMark /></div>}
      {state === "preparing" && <p className="practice-status" role="status">Preparing lesson context and copying it…</p>}
      {state === "ready" && <>
        <a className="primary-action" href={chatGPTDestination} target="_blank" rel="noopener noreferrer" onClick={event => { if (openNativeChatGPT()) event.preventDefault(); }}>Open ChatGPT <span aria-hidden="true">↗</span></a>
        <p className="practice-handoff-note">Paste the context, send it, then start Voice.</p>
        <button className="text-action" disabled={copying} onClick={copyAgain}>{copying ? "Copying…" : "Copy Again"}</button>
        {copyNote && <p className="practice-status" role="status">{copyNote}</p>}
        <div className="practice-focus"><p className="eyebrow">Current focus</p><p>{focus}</p></div>
      </>}
      {state === "error" && <>
        <button className="primary-action" disabled={copying} onClick={context ? copyAgain : prepare}>{context ? "Retry copy" : "Retry preparation"}</button>
        {copyNote && <p className="practice-status" role="status">{copyNote}</p>}
        {context && <details className="practice-manual-copy"><summary>Copy context manually</summary><textarea readOnly value={context} aria-label="Practice context" onFocus={event => event.currentTarget.select()} /></details>}
      </>}
      <button className="text-action practice-return" onClick={returnToLesson}>Return to lesson</button>
    </div>}
  </div>;
}

function PracticeMark() {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 13v6M11 8v16M16 4v24M21 9v14M26 13v6" /></svg>;
}
