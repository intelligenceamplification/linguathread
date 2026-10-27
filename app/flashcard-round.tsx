"use client";
import { useEffect, useRef, useState } from "react";
import type { Flashcard } from "./reinforcement";
import ListenButton from "./listen-button";
import { speechLanguage } from "./speech";
import { approvedAudioFor } from "./audio-pack";

function CardAudio({ text, language, contextText, compact = false }: { text: string; language: "Spanish" | "Vietnamese"; contextText: string; compact?: boolean }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    approvedAudioFor(text, speechLanguage(language)!, contextText).then(clip => { if (!cancelled) setAvailable(Boolean(clip)); });
    return () => { cancelled = true; };
  }, [text, language, contextText]);
  return available ? <ListenButton text={text} language={speechLanguage(language)!} contextText={contextText} compact={compact} /> : null;
}

export type CardRating = (card: Flashcard, known: boolean, session: string, latency: number) => void;
export type DailyCards = { ids: string[]; session: string; position: number; revealed: boolean };

export default function FlashcardRound({ cards, onRating, onFinish, daily, onDailyChange }: {
  cards: Flashcard[]; onRating: CardRating; onFinish: () => void;
  daily?: DailyCards; onDailyChange?: (value: DailyCards) => void;
}) {
  const [roundSession] = useState(() => daily?.session || crypto.randomUUID());
  const [position, setPosition] = useState(daily?.position || 0);
  const [revealed, setRevealed] = useState(daily?.revealed || false);
  const [knownCount, setKnownCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const ratingLock = useRef(false);
  const started = useRef(0);
  useEffect(() => { started.current = Date.now(); ratingLock.current = false; }, [position]);
  const card = cards[position];
  function save(nextPosition: number, nextReveal: boolean) {
    onDailyChange?.({ ids: cards.map(c => c.id), session: roundSession, position: nextPosition, revealed: nextReveal });
  }
  function rate(known: boolean) {
    if (!revealed || !card || ratingLock.current) return;
    ratingLock.current = true;
    onRating(card, known, roundSession, Math.max(0, Date.now() - started.current));
    if (known) setKnownCount(value => value + 1); else setRetryCount(value => value + 1);
    save(position + 1, false); setPosition(value => value + 1); setRevealed(false);
  }
  if (!card) return <div className="focus-content review-content">
    <p className="eyebrow">{daily ? "Daily reinforcement" : "Flashcards"} · Saved</p>
    <h1>A little more familiar.</h1>
    <p className="review-introduction">Your ratings have updated the shared review schedule. Difficult cards return sooner; familiar cards receive more space.</p>
    {knownCount + retryCount > 0 && <p className="review-note">{knownCount} familiar · {retryCount} to practise again</p>}
    <p className="review-note">Self-ratings guide practice. Independent recall is checked separately.</p>
    <button className="primary-action" onClick={onFinish}>{daily ? "Continue daily path" : "Back to flashcards"} →</button>
  </div>;
  return <div className="focus-content flashcard-content">
    <button className="text-action" onClick={onFinish}>{daily ? "Continue daily path" : "← Flashcards"}</button>
    <header className="review-context">
      <p className="eyebrow">{daily ? "Daily reinforcement" : "Flashcards"} · {position + 1} of {cards.length}</p>
      <h2>{card.lesson.title}</h2>
      <p>{card.kind} · English meaning → {card.language}</p>
      <progress className="review-progress" value={position} max={cards.length} aria-label="Flashcards completed" />
    </header>
    <p className="eyebrow">Recall before revealing</p>
    <h1 className="flashcard-prompt">{card.prompt}</h1>
    {!revealed ? <><p className="review-note">Bring the {card.language} to mind, then compare it with the model.</p><button className="primary-action" onClick={() => { setRevealed(true); save(position, true); }}>Reveal</button></> : <div className="flashcard-answer" role="region" aria-label="Revealed model">
      <h2 lang={speechLanguage(card.language) || undefined}>{card.answer}</h2>
      <CardAudio key={card.id} text={card.answer} language={card.language} contextText={card.language === "Spanish" ? card.lesson.sentence.target : card.lesson.sentence.bridge} />
      {card.stack.filter(row => row.language !== card.language).map(row => <div className="flashcard-stack" key={row.language}><span>{row.language} · same meaning</span><p lang={speechLanguage(row.language) || undefined}>{row.text}</p><CardAudio key={`${card.id}:${row.language}`} text={row.text} language={row.language} contextText={row.language === "Spanish" ? card.lesson.sentence.target : card.lesson.sentence.bridge} compact /></div>)}
      {card.explanation && <p className="review-note">{card.explanation}</p>}
      <div className="flashcard-actions"><button className="primary-action" onClick={() => rate(true)}>Know it</button><button className="quiet-action" onClick={() => rate(false)}>Practice again</button></div>
    </div>}
  </div>;
}
