"use client";
import { useState } from "react";

type Props = { direction: "ltr" | "rtl"; words: string[]; selected: number[]; disabled: boolean; onChange: (selected: number[]) => void; onUndo: () => void; canUndo: boolean };

/** Occurrences have distinct identities, even when their text is the same. */
export default function ReviewPhraseBuilder({ direction, words, selected, disabled, onChange, onUndo, canUndo }: Props) {
  const [moving, setMoving] = useState<number | null>(null);
  const order = words.map((_, index) => index).reverse();
  function chooseSelected(id: number, index: number) {
    if (moving !== null) {
      const next = [...selected]; next.splice(index, 0, moving); onChange(next); setMoving(null);
    } else {
      onChange(selected.filter((_, i) => i !== index)); setMoving(id);
    }
  }
  function chooseAvailable(id: number) { onChange([...selected, id]); setMoving(null); }
  return <div className="phrase-builder">
    <div className="phrase-tiles phrase-selected" dir={direction} aria-label="Your phrase">{selected.map((id, index) =>
      <button type="button" key={id} disabled={disabled} onClick={() => chooseSelected(id, index)} aria-label={moving === null ? `Remove or move ${words[id]}` : `Place ${words[moving]} before ${words[id]}`}>{words[id]}</button>)}</div>
    {!disabled && <><p className="review-note">{moving === null ? "Tap a word to add or remove it." : "Tap a word above to move it there, or choose a word below."}</p>
    <div className="phrase-tiles" dir={direction} aria-label="Available words">{order.filter(id => !selected.includes(id)).map(id => <button type="button" key={id} disabled={disabled} onClick={() => chooseAvailable(id)}>{words[id]}</button>)}</div>
    <div className="phrase-tools"><button type="button" disabled={disabled || !canUndo} onClick={() => { setMoving(null); onUndo(); }}>Undo</button><button type="button" disabled={disabled || !selected.length} onClick={() => { setMoving(null); onChange([]); }}>Clear</button></div></>}
  </div>;
}
