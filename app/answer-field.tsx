"use client";

import { useLayoutEffect, useRef } from "react";

type AnswerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  placeholder: string;
  label: string;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
};

export function AnswerField({ value, onChange, onEnter, placeholder, label, lang, dir, maxLength, disabled, autoFocus = true }: AnswerFieldProps) {
  const field = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.max(112, element.scrollHeight)}px`;
    if (document.activeElement === element) element.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);

  return <textarea
    ref={field}
    className="answer-field"
    autoFocus={autoFocus}
    rows={3}
    lang={lang}
    dir={dir}
    maxLength={maxLength}
    disabled={disabled}
    autoComplete="off"
    autoCorrect="off"
    spellCheck={false}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    onKeyDown={(event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        onEnter();
      }
    }}
    placeholder={placeholder}
    aria-label={label}
  />;
}
