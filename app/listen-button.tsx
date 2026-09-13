"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { languageInfo, type FoundationLanguage } from "./multilingual-foundation";
import { speechLocales, voiceForLanguage } from "./speech";
import { approvedAudioFor } from "./audio-pack";

const speechEvent = "linguathread:speech-start";
const nativeSpeechStartEvent = "linguathread:native-speech-started";
const nativeSpeechEndEvent = "linguathread:native-speech-ended";
const nativeSpeechCancelEvent = "linguathread:native-speech-cancelled";
const subscribeToSpeechSupport = () => () => {};
const nativeHandler = () => (window as Window & { webkit?: { messageHandlers?: { linguathreadAudio?: { postMessage: (value: unknown) => void } } }; __LINGUATHREAD_NATIVE_SPEECH__?: boolean }).webkit?.messageHandlers?.linguathreadAudio;
const hasSpeechSupport = () => Boolean(nativeHandler()) || ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
const noServerSpeechSupport = () => false;

export default function ListenButton({ text, language, onUse, onPlayback, onComplete, onError, compact = false }: { text: string; language: FoundationLanguage; onUse?: () => void; onPlayback?: () => void; onComplete?: () => void; onError?: () => void; compact?: boolean }) {
 const id = useId();
 const supported = useSyncExternalStore(subscribeToSpeechSupport, hasSpeechSupport, noServerSpeechSupport);
 const [speaking, setSpeaking] = useState(false);
 const playback = useRef(onPlayback);
 const completion = useRef(onComplete);
 const failure = useRef(onError);
 const speakingRef = useRef(false);
 const audioRef = useRef<HTMLAudioElement | null>(null);
 useEffect(() => { playback.current = onPlayback; }, [onPlayback]);
 useEffect(() => { completion.current = onComplete; }, [onComplete]);
 useEffect(() => { failure.current = onError; }, [onError]);
 useEffect(() => { speakingRef.current = speaking; }, [speaking]);

 useEffect(() => {
  const resetForAnother = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) { audioRef.current?.pause(); setSpeaking(false); } };
  window.addEventListener(speechEvent, resetForAnother);
  const nativeEnded = (event: Event) => { if ((event as CustomEvent<string>).detail === id) { setSpeaking(false); completion.current?.(); } };
  const nativeStarted = (event: Event) => { if ((event as CustomEvent<string>).detail === id) { setSpeaking(true); playback.current?.(); } };
  const nativeCancelled = (event: Event) => { if ((event as CustomEvent<string>).detail === id) setSpeaking(false); };
  window.addEventListener(nativeSpeechEndEvent, nativeEnded);
  window.addEventListener(nativeSpeechStartEvent, nativeStarted);
  window.addEventListener(nativeSpeechCancelEvent, nativeCancelled);
  return () => {
   window.removeEventListener(speechEvent, resetForAnother); window.removeEventListener(nativeSpeechEndEvent, nativeEnded); window.removeEventListener(nativeSpeechStartEvent, nativeStarted); window.removeEventListener(nativeSpeechCancelEvent, nativeCancelled);
   if (speakingRef.current) { nativeHandler()?.postMessage({ action: "stop", requestID: id }); window.speechSynthesis?.cancel(); audioRef.current?.pause(); }
  };
 }, [id]);

 async function toggle() {
  if (!supported) return;
  if (speaking) {
    nativeHandler()?.postMessage({ action: "stop" });
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    setSpeaking(false);
    return;
  }
  onUse?.();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  window.dispatchEvent(new CustomEvent(speechEvent, { detail: id }));
  const approved = await approvedAudioFor(text, language);
  if (approved) {
   const audio = new Audio(approved.url);
   audioRef.current = audio;
   audio.onplay = () => { setSpeaking(true); playback.current?.(); };
   audio.onended = () => { setSpeaking(false); completion.current?.(); };
   audio.onerror = () => { setSpeaking(false); failure.current?.(); };
   try { await audio.play(); } catch { setSpeaking(false); failure.current?.(); }
   return;
  }
  const native = nativeHandler();
  if (native) {
    try {
      native.postMessage({ action: "speak", text, language: speechLocales[language], requestID: id });
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
  utterance.onstart = () => { setSpeaking(true); playback.current?.(); };
  utterance.onend = () => { setSpeaking(false); completion.current?.(); };
  utterance.onerror = () => { setSpeaking(false); failure.current?.(); };
  window.speechSynthesis.speak(utterance);
 }

 if (supported === false) return <span className="audio-unavailable">Audio unavailable on this device</span>;
 return <button type="button" className={`listen-action${compact ? " listen-action-compact" : ""}`} aria-label={`${speaking ? "Stop" : "Listen to"} ${languageInfo(language).name}`} title={compact ? `${speaking ? "Stop" : "Listen to"} ${languageInfo(language).name}` : undefined} onClick={toggle}>
  <svg aria-hidden="true" viewBox="0 0 24 24"><path d={speaking ? "M7 7h10v10H7z" : "M4 10v4h4l5 4V6L8 10H4zm12.5-1.8a5 5 0 010 7.6m2.2-9.8a8 8 0 010 12"} /></svg>
  <span className="listen-action-label">{speaking ? "Stop" : "Listen"}</span>
 </button>;
}
