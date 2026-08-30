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
        <div className="intro-copy">
          <p className="intro-kicker">A language-stacking practice</p>
          <div className="intro-mark">
            <svg className="intro-thread-art" viewBox="0 0 1200 500" role="presentation" aria-hidden="true">
              <defs>
                <linearGradient id="intro-thread-fade" x1="0" y1="0" x2="1" y2="0">
                  <stop className="intro-thread-stop" offset="0%" />
                  <stop className="intro-thread-stop" offset="31%" />
                  <stop className="intro-thread-stop-transparent" offset="44%" />
                  <stop className="intro-thread-stop-transparent" offset="56%" />
                  <stop className="intro-thread-stop" offset="69%" />
                  <stop className="intro-thread-stop" offset="100%" />
                </linearGradient>
              </defs>
              <path className="intro-thread-single" d="M78 250 C320 250 424 250 600 250 C776 250 880 250 1122 250" />
              <g className="intro-strands">
                <path className="intro-strand intro-strand-one" d="M148 102 C300 102 350 190 455 219 C535 241 665 241 745 219 C850 190 900 102 1052 102" />
                <path className="intro-strand intro-strand-two" d="M104 250 C288 250 352 250 458 250 C548 250 652 250 742 250 C848 250 912 250 1096 250" />
                <path className="intro-strand intro-strand-three" d="M148 398 C300 398 350 310 455 281 C535 259 665 259 745 281 C850 310 900 398 1052 398" />
                <path className="intro-strand intro-strand-four" d="M600 286 C600 330 600 365 600 454" />
              </g>
              <g className="intro-language-fragments">
                <text x="92" y="94">관계</text>
                <text className="intro-fragment-end" x="1108" y="94">이해</text>
                <text className="intro-fragment-italic" x="72" y="258">quan hệ</text>
                <text className="intro-fragment-italic intro-fragment-end" x="1128" y="258">thấu hiểu</text>
                <text className="intro-fragment-italic" x="92" y="414">relación</text>
                <text className="intro-fragment-italic intro-fragment-end" x="1108" y="414">comprensión</text>
                <text x="579" y="352">명령</text>
                <text className="intro-fragment-italic" x="554" y="408">mệnh lệnh</text>
                <text className="intro-fragment-italic" x="555" y="462">imperativo</text>
              </g>
            </svg>
            <h1 id="intro-title">LinguaThread</h1>
          </div>
          <p className="intro-title-line">How Language Is Built.</p>
          <p className="intro-invitation">Pull a thread. Follow the meaning.</p>
          <button className="primary-action intro-begin" onClick={onBegin}>Begin <span aria-hidden="true">→</span></button>
        </div>
      </section>
    </main>
  );
}
