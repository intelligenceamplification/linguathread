"use client";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { languageInfo, type FoundationLanguage } from "./multilingual-foundation";
import { speechLocales, voiceForLanguage } from "./speech";

const speechEvent = "linguathread:speech-start";
const nativeSpeechEndEvent = "linguathread:native-speech-ended";
const subscribeToSpeechSupport = () => () => {};
const nativeHandler = () => (window as Window & { webkit?: { messageHandlers?: { linguathreadAudio?: { postMessage: (value: unknown) => void } } }; __LINGUATHREAD_NATIVE_SPEECH__?: boolean }).webkit?.messageHandlers?.linguathreadAudio;
const hasSpeechSupport = () => Boolean(nativeHandler()) || ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
const noServerSpeechSupport = () => false;

export default function ListenButton({ text, language, onUse }: { text: string; language: FoundationLanguage; onUse?: () => void }) {
 const id = useId();
 const supported = useSyncExternalStore(subscribeToSpeechSupport, hasSpeechSupport, noServerSpeechSupport);
 const [speaking, setSpeaking] = useState(false);

 useEffect(() => {
  const resetForAnother = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) setSpeaking(false); };
  window.addEventListener(speechEvent, resetForAnother);
  const nativeEnded = () => setSpeaking(false);
  window.addEventListener(nativeSpeechEndEvent, nativeEnded);
  return () => { window.removeEventListener(speechEvent, resetForAnother); window.removeEventListener(nativeSpeechEndEvent, nativeEnded); };
 }, [id]);

 function toggle() {
  if (!supported) return;
  if (speaking) {
    nativeHandler()?.postMessage({ action: "stop" });
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
    return;
  }
  onUse?.();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  window.dispatchEvent(new CustomEvent(speechEvent, { detail: id }));
  const native = nativeHandler();
  if (native) {
    try {
      native.postMessage({ action: "speak", text, language: speechLocales[language] });
      setSpeaking(true);
      return;
    } catch {
      // Continue with the browser/device speech engine below.
    }
  }
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
 return <button type="button" className="listen-action" aria-label={`${speaking ? "Stop" : "Listen to"} ${languageInfo(language).name}`} onClick={toggle}>
  <svg aria-hidden="true" viewBox="0 0 24 24"><path d={speaking ? "M7 7h10v10H7z" : "M4 10v4h4l5 4V6L8 10H4zm12.5-1.8a5 5 0 010 7.6m2.2-9.8a8 8 0 010 12"} /></svg>
  <span>{speaking ? "Stop" : "Listen"}</span>
 </button>;
}
