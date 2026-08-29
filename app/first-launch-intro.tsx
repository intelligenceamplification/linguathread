"use client";

import { useState, type CSSProperties, type PointerEvent } from "react";

type ThreadStyle = CSSProperties & {
  "--pointer-x"?: string;
  "--pointer-y"?: string;
};

export function FirstLaunchIntro({ onBegin }: { onBegin: () => void }) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const threadStyle: ThreadStyle = {
    "--pointer-x": `${pointer.x}px`,
    "--pointer-y": `${pointer.y}px`,
  };

  function followPointer(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 16,
      y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 10,
    });
  }

  function releasePointer() {
    setPointer({ x: 0, y: 0 });
  }

  return (
    <main className="app-shell intro-shell">
      <section
        className="intro-stage"
        aria-labelledby="intro-title"
        onPointerMove={followPointer}
        onPointerLeave={releasePointer}
        style={threadStyle}
      >
        <div className="intro-thread-field" aria-hidden="true">
          <svg className="intro-thread-art" viewBox="0 0 1000 720" role="presentation">
            <path className="intro-thread-single" d="M72 374 C228 374 285 310 412 354 C552 403 625 280 766 337 C834 364 856 405 928 374" />
            <g className="intro-strands">
              <path className="intro-strand intro-strand-one" d="M72 374 C194 374 262 334 374 362 C484 389 574 201 700 264 C806 317 816 429 928 430" />
              <path className="intro-strand intro-strand-two" d="M72 374 C200 374 248 452 366 431 C494 408 569 564 695 473 C795 400 838 482 928 430" />
              <path className="intro-strand intro-strand-three" d="M72 374 C193 374 258 414 374 389 C485 365 574 316 684 360 C786 402 824 480 928 430" />
            </g>
            <g className="intro-direction intro-direction-forward">
              <path d="M72 374 C194 374 262 334 374 362 C484 389 574 201 700 264 C806 317 816 429 928 430" />
              <path d="M72 374 C200 374 248 452 366 431 C494 408 569 564 695 473 C795 400 838 482 928 430" />
            </g>
            <path className="intro-direction intro-direction-reverse" d="M928 430 C824 480 786 402 684 360 C574 316 485 365 374 389 C258 414 193 374 72 374" />
          </svg>
        </div>
        <div className="intro-copy">
          <p className="intro-kicker">A language-stacking practice</p>
          <h1 id="intro-title">LinguaThread</h1>
          <p className="intro-title-line">How Language Is Built.</p>
          <p className="intro-invitation">Pull a thread. Discover how language is built.</p>
          <button className="primary-action intro-begin" onClick={onBegin}>Begin <span aria-hidden="true">→</span></button>
        </div>
      </section>
    </main>
  );
}
