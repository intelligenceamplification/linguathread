"use client";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { languageInfo, type FoundationLanguage } from "./multilingual-foundation";
import { speechLocales, voiceForLanguage } from "./speech";
import { approvedAudioFor, normalizeAudioText, nativeAudioNeedsUpdate, requiresNativeApprovedAudio, type ApprovedAudioClip } from "./audio-pack";
import { spokenText } from "./spoken-text";
import { instructionalAudioText } from "./instructional-audio-models";

const speedEvent = "linguathread:audio-speed";
const speedKey = "linguathread.audio-speed.v1";
let memorySpeed = "normal";
const readSpeed = () => { try { return window.localStorage.getItem(speedKey) === "slow" ? "slow" : "normal"; } catch { return memorySpeed; } };
const subscribeSpeed = (notify: () => void) => {
 window.addEventListener(speedEvent, notify);
 window.addEventListener("storage", notify);
 return () => { window.removeEventListener(speedEvent, notify); window.removeEventListener("storage", notify); };
};
const serverSpeed = () => "normal";

const speechEvent = "linguathread:speech-start";
const nativeSpeechStartEvent = "linguathread:native-speech-started";
const nativeSpeechEndEvent = "linguathread:native-speech-ended";
const nativeSpeechCancelEvent = "linguathread:native-speech-cancelled";
const nativeSpeechErrorEvent = "linguathread:native-speech-error";
const subscribeToSpeechSupport = () => () => {};
const nativeHandler = () => (window as Window & { webkit?: { messageHandlers?: { linguathreadAudio?: { postMessage: (value: unknown) => void } } }; __LINGUATHREAD_NATIVE_SPEECH__?: boolean; __LINGUATHREAD_NATIVE_CLIP__?: boolean }).webkit?.messageHandlers?.linguathreadAudio;
const supportsNativeClip = () => Boolean((window as Window & { __LINGUATHREAD_NATIVE_CLIP__?: boolean }).__LINGUATHREAD_NATIVE_CLIP__);
const hasSpeechSupport = () => Boolean(nativeHandler()) || ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
const noServerSpeechSupport = () => false;
const nativeAudioVersion = () => (window as Window & { __LINGUATHREAD_NATIVE_AUDIO_VERSION__?: number }).__LINGUATHREAD_NATIVE_AUDIO_VERSION__ ?? 0;

export default function ListenButton({ text: requestedText, language, contextText, onUse, onPlayback, onComplete, onError, compact = false }: { text: string; language: FoundationLanguage; contextText?: string; onUse?: () => void; onPlayback?: () => void; onComplete?: (reviewed?: boolean) => void; onError?: () => void; compact?: boolean }) {
 const text = requiresNativeApprovedAudio(language) ? instructionalAudioText(requestedText, language) : requestedText;
 const [contextModel, setContextModel] = useState<{ key: string; text: string } | null>(null);
 const displayText = contextModel?.key === `${language}\u0000${text}` ? contextModel.text : text;
 const contextual = displayText !== requestedText;
 const id = useId();
 const supported = useSyncExternalStore(subscribeToSpeechSupport, hasSpeechSupport, noServerSpeechSupport);
 const [speaking, setSpeaking] = useState(false);
 const [liveRateAvailable, setLiveRateAvailable] = useState(false);
 const [unavailable, setUnavailable] = useState(false);
 const [preparingKey, setPreparingKey] = useState<string | null>(null);
 const activeTextKey = `${language}\u0000${text}`;
 const preparing = preparingKey === activeTextKey;
 const preparingRef = useRef(false);
 const requestGeneration = useRef(0);
 const nativeRequest = useRef(id);
 const speed = useSyncExternalStore(subscribeSpeed, readSpeed, serverSpeed);
 const rate = speed === "slow" ? 0.75 : 1;
 const playback = useRef(onPlayback);
 const completion = useRef(onComplete);
 const failure = useRef(onError);
 const speakingRef = useRef(false);
 const audioRef = useRef<HTMLAudioElement | null>(null);
 const selectedClip = useRef<{ key: string; clip: ApprovedAudioClip | null } | null>(null);
 const independentPlayback = useRef(false);
 useEffect(() => {
  if (!contextText || !supported) return;
  let cancelled = false;
  approvedAudioFor(text, language, contextText).then((clip) => {
   if (cancelled || !clip) return;
   setContextModel({ key: activeTextKey, text: clip.text });
  });
  return () => { cancelled = true; };
 }, [activeTextKey, contextText, language, supported, text]);
 useEffect(() => { playback.current = onPlayback; }, [onPlayback]);
 useEffect(() => { completion.current = onComplete; }, [onComplete]);
 useEffect(() => { failure.current = onError; }, [onError]);
 useEffect(() => {
  if (!hasSpeechSupport() || nativeAudioNeedsUpdate(language)) failure.current?.();
 }, [supported, language]);
 useEffect(() => { speakingRef.current = speaking; }, [speaking]);
 useEffect(() => { preparingRef.current = preparing; }, [preparing]);
 useEffect(() => {
  if (!speakingRef.current) return;
  if (audioRef.current) audioRef.current.playbackRate = rate;
  if (nativeAudioVersion() >= 2) nativeHandler()?.postMessage({ action: "setRate", rate, requestID: nativeRequest.current });
 }, [rate]);

 useEffect(() => {
  const requests = requestGeneration;
  const resetForAnother = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) { const stoppedRequest = nativeRequest.current; requestGeneration.current++; nativeRequest.current = `${id}:inactive:${requestGeneration.current}`; nativeHandler()?.postMessage({ action: "stop", requestID: stoppedRequest }); audioRef.current?.pause(); setSpeaking(false); setPreparingKey(null); } };
  window.addEventListener(speechEvent, resetForAnother);
  const nativeEnded = (event: Event) => { if ((event as CustomEvent<string>).detail === nativeRequest.current) { setPreparingKey(null); setSpeaking(false); completion.current?.(independentPlayback.current); } };
  const nativeStarted = (event: Event) => { if ((event as CustomEvent<string>).detail === nativeRequest.current) { setPreparingKey(null); setSpeaking(true); playback.current?.(); } };
  const nativeCancelled = (event: Event) => { if ((event as CustomEvent<string>).detail === nativeRequest.current) { setPreparingKey(null); setSpeaking(false); } };
  const nativeError = (event: Event) => { if ((event as CustomEvent<string>).detail === nativeRequest.current) { setPreparingKey(null); setSpeaking(false); if (requiresNativeApprovedAudio(language)) setUnavailable(true); failure.current?.(); } };
  window.addEventListener(nativeSpeechEndEvent, nativeEnded);
  window.addEventListener(nativeSpeechStartEvent, nativeStarted);
  window.addEventListener(nativeSpeechCancelEvent, nativeCancelled);
  window.addEventListener(nativeSpeechErrorEvent, nativeError);
  return () => {
   window.removeEventListener(speechEvent, resetForAnother); window.removeEventListener(nativeSpeechEndEvent, nativeEnded); window.removeEventListener(nativeSpeechStartEvent, nativeStarted); window.removeEventListener(nativeSpeechCancelEvent, nativeCancelled); window.removeEventListener(nativeSpeechErrorEvent, nativeError);
   const stoppedRequest = nativeRequest.current; requests.current++; nativeRequest.current = `${id}:inactive:${requests.current}`;
   if (speakingRef.current || preparingRef.current) { nativeHandler()?.postMessage({ action: "stop", requestID: stoppedRequest }); window.speechSynthesis?.cancel(); audioRef.current?.pause(); }
  };
 }, [id, language, text]);

 async function toggle() {
  if (!supported || preparing) return;
  if (speaking) {
    const stoppedRequest = nativeRequest.current; requestGeneration.current++; nativeRequest.current = `${id}:inactive:${requestGeneration.current}`;
    nativeHandler()?.postMessage({ action: "stop", requestID: stoppedRequest });
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    setSpeaking(false);
    return;
  }
  onUse?.();
  setUnavailable(false);
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  window.dispatchEvent(new CustomEvent(speechEvent, { detail: id }));
  const generation = ++requestGeneration.current;
  nativeRequest.current = `${id}:${generation}`;
  if (requiresNativeApprovedAudio(language)) { preparingRef.current = true; setPreparingKey(activeTextKey); }
  const clipKey = `${language}\u0000${text}`;
  const approved = selectedClip.current?.key === clipKey
   ? selectedClip.current.clip
   : await approvedAudioFor(text, language, contextText);
  if (generation !== requestGeneration.current) return;
  selectedClip.current = approved ? { key: clipKey, clip: approved } : null;
  independentPlayback.current = Boolean(approved?.reviewedAt) && approved?.normalizedText === normalizeAudioText(requestedText);
  if (approved) setContextModel({ key: activeTextKey, text: approved.text });
  setLiveRateAvailable(Boolean(approved) && (!nativeHandler() || nativeAudioVersion() >= 2));
  if (approved) {
   const native = nativeHandler();
   if (native && supportsNativeClip()) {
    native.postMessage({ action: "playClip", url: approved.url, language, rate, requestID: nativeRequest.current });
    return;
   }
   const audio = new Audio(approved.url);
   // Preserve the exact timing of a clip accepted through listening review.
   audio.playbackRate = rate;
   audio.preservesPitch = true;
   audioRef.current = audio;
   audio.onplay = () => { if (generation !== requestGeneration.current) return; setPreparingKey(null); setSpeaking(true); playback.current?.(); };
   audio.onended = () => { if (generation !== requestGeneration.current) return; setPreparingKey(null); setSpeaking(false); completion.current?.(independentPlayback.current); };
   audio.onerror = () => { if (generation !== requestGeneration.current) return; setPreparingKey(null); setSpeaking(false); failure.current?.(); };
   try { await audio.play(); } catch { if (generation !== requestGeneration.current) return; setPreparingKey(null); setSpeaking(false); failure.current?.(); }
   return;
  }
  if (requiresNativeApprovedAudio(language)) {
    setPreparingKey(null);
    setUnavailable(true);
    failure.current?.();
    return;
  }
  const native = nativeHandler();
  if (native) {
    try {
      native.postMessage({ action: "speak", text: spokenText(text), language: speechLocales[language], rate, requestID: nativeRequest.current });
      return;
    } catch {
      // Continue with the browser/device speech engine below.
    }
  }
  const utterance = new SpeechSynthesisUtterance(spokenText(text));
  utterance.lang = speechLocales[language];
  utterance.rate = 0.78 * rate;
  utterance.pitch = 1;
  const voice = voiceForLanguage(window.speechSynthesis.getVoices(), language);
  if (voice) utterance.voice = voice;
  utterance.onstart = () => { setPreparingKey(null); setSpeaking(true); playback.current?.(); };
  utterance.onend = () => { if (generation !== requestGeneration.current) return; setPreparingKey(null); setSpeaking(false); completion.current?.(false); };
  utterance.onerror = () => { setSpeaking(false); failure.current?.(); };
  window.speechSynthesis.speak(utterance);
 }

 if (supported === false) return <span className="audio-unavailable">Audio unavailable on this device</span>;
 if (nativeAudioNeedsUpdate(language)) return <span role="status" className="audio-unavailable">Update the iPhone app to use approved lesson audio.</span>;
 return <span className={`audio-controls${compact ? " audio-controls-compact" : ""}`}>{contextual && <span className="audio-model-context"><small>Listen in context</small><span lang={language}>{displayText}</span></span>}<button type="button" className={`listen-action${compact ? " listen-action-compact" : ""}`} disabled={preparing} aria-busy={preparing} aria-label={`${speaking ? "Stop" : "Listen to"} ${languageInfo(language).name}${contextual ? " in context" : ""}`} title={compact ? `${speaking ? "Stop" : "Listen to"} ${languageInfo(language).name}` : undefined} onClick={toggle}>
  <svg aria-hidden="true" viewBox="0 0 24 24"><path d={speaking ? "M7 7h10v10H7z" : "M4 10v4h4l5 4V6L8 10H4zm12.5-1.8a5 5 0 010 7.6m2.2-9.8a8 8 0 010 12"} /></svg>
  <span className="listen-action-label">{preparing ? "Preparing…" : speaking ? "Stop" : "Listen"}</span>
 </button><select className="audio-speed" aria-label="Audio playback speed" value={speed} disabled={preparing || (speaking && !liveRateAvailable)} onChange={(event) => { memorySpeed = event.target.value; try { window.localStorage.setItem(speedKey, memorySpeed); } catch { /* Playback still works when storage is unavailable. */ } window.dispatchEvent(new Event(speedEvent)); }}><option value="normal">Normal</option><option value="slow">Slow</option></select>{unavailable && <span role="status" className="audio-unavailable">Lesson audio unavailable. Please retry.</span>}</span>;
}
