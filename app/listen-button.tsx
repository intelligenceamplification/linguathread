"use client";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { languageInfo, type FoundationLanguage } from "./multilingual-foundation";
import { speechLocales, voiceForLanguage } from "./speech";

const speechEvent = "linguathread:speech-start";
const subscribeToSpeechSupport = () => () => {};
const hasSpeechSupport = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
const noServerSpeechSupport = () => false;

export default function ListenButton({ text, language, onUse }: { text: string; language: FoundationLanguage; onUse?: () => void }) {
 const id = useId();
 const supported = useSyncExternalStore(subscribeToSpeechSupport, hasSpeechSupport, noServerSpeechSupport);
 const [speaking, setSpeaking] = useState(false);

 useEffect(() => {
  const resetForAnother = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) setSpeaking(false); };
  window.addEventListener(speechEvent, resetForAnother);
  return () => window.removeEventListener(speechEvent, resetForAnother);
 }, [id]);

 function toggle() {
  if (!supported) return;
  if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
  onUse?.();
  window.speechSynthesis.cancel();
  window.dispatchEvent(new CustomEvent(speechEvent, { detail: id }));
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = speechLocales[language];
  utterance.rate = 0.86;
  utterance.pitch = 1;
  const voice = voiceForLanguage(window.speechSynthesis.getVoices(), language);
  if (voice) utterance.voice = voice;
  utterance.onstart = () => setSpeaking(true);
  utterance.onend = () => setSpeaking(false);
  utterance.onerror = () => setSpeaking(false);
  window.speechSynthesis.speak(utterance);
 }

 if (supported === false) return <span className="audio-unavailable">Audio unavailable on this device</span>;
 return <button type="button" className="listen-action" aria-label={`${speaking ? "Stop" : "Listen to"} ${languageInfo(language).name}`} onClick={toggle}>{speaking ? "Stop" : "Listen"}</button>;
}
