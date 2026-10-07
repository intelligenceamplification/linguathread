# Live Practice: ChatGPT handoff

Live Practice is a zero-additional-API-cost extension of the current lesson. Its single entry is beneath the current lesson activity in Today’s Lesson at every lesson stage, including initial listening and completion, matching the supplied entry mockup. There is no new navigation destination.

## Flow

Start Live Practice → prepare current context and copy → context ready → Open ChatGPT → learner pastes/sends and starts Voice normally.

Start Live Practice exists in one component and is shown once. Open ChatGPT exists once in the ready state. There is no second initiation confirmation. Return to lesson restores the mounted current activity, including any Reverse Recall answer, feedback and attempts, and returns keyboard focus to the entry. Existing navigation still works. A reload uses the existing lesson restoration mechanism; the transient handoff itself is not stored as learner progress.

Preparation performs actual synchronous context selection followed by an asynchronous clipboard operation. It stays visible only while that operation is pending, with no artificial delay or timed checklist. Ready is shown only after successful copying. A denial shows Retry copy and an optional manually selectable prompt; no external-opening action appears until copying succeeds. Copy Again is secondary and does not regenerate a different lesson prompt.

## Exact context selection

The context generator reads the current LessonDefinition, normalized LanguageProfile, existing LearnerModel, loaded course, and current activity when the learner selects Start.

- LanguageProfile.native supplies the anchor. activeSelections(profile) supplies active learning language names in existing priority order; paused languages are excluded.
- Current lesson: id, title, unitTitle, level, skill, stage. The internal lesson id is used to select material, but is not printed in the prompt.
- Expressions: sentence.anchor (English), sentence.target (Spanish), sentence.bridge (Vietnamese), and existing sentence.translations, restricted to the active stack plus anchor.
- Grammar: grammar.anchor, grammar.target, grammar.bridge and grammar.additional, restricted to that stack. Only pattern and explanation enter the prompt; explanations are capped at 260 characters.
- Vocabulary: the first six current vocabulary items, using word, english, vietnamese and existing translations; meanings are restricted to the active stack. No new vocabulary is authored by the feature.
- Recent material: at most two distinct previously attempted objectives, ordered by existing lastPracticedAt, matched to current loaded course lessons. Only lesson title and stack-filtered expressions are copied; dates and attempt histories are not copied.
- Pathways: at most three attempted evidence items for the current objective or three most recent relevant objectives. Existing score below 58 selects reinforcement; existing nextReviewAt at or before preparation selects review. Only objectiveId, language, reason, directional edge (fromLanguage, toLanguage, fromModality, toModality, retrievalType) and errorType are included. Paused/foreign language edges and zero-attempt evidence are excluded. Scores and timestamps are used for selection but are not printed.

No learner/session identity, full history, answer text, settings, or new mastery estimate enters the prompt. The feature never records practice as completion or competence. Diacritics are preserved with NFC normalization.

The prompt asks ChatGPT to practice every direction between the anchor and active languages where appropriate, recycle familiar material, wait for retrieval, correct concisely, use idiomatic register, explain X-ray structure on request, and start with a short practice question. It does not claim ChatGPT can update LinguaThread.

## Clipboard and external-opening boundary

app/live-practice-handoff.ts is the replaceable boundary. Context selection, UI and pedagogy do not depend on its destination-opening implementation.

Web uses navigator.clipboard.writeText inside the initial user action, and awaits success. Open ChatGPT is a normal HTTPS anchor to https://chatgpt.com/, in a new browsing context with noopener/noreferrer. No lesson content enters the URL.

iOS uses a small WKWebView main-frame bridge limited to the existing HTTPS LinguaThread host. Copy writes UIPasteboard.general.string and acknowledges the request ID before the UI reports success. Open requests UIApplication.open with universalLinksOnly for the standard ChatGPT HTTPS destination. If iOS cannot resolve an installed app for that URL, normal system HTTPS opening falls back to the browser. No unofficial custom scheme, prompt-prefill parameter, prompt submission or Voice activation is used. The same HTTPS destination is also recognized in the web view’s navigation delegate.

## Mockup adaptation

The entry reuses eyebrow and primary-action styling. The preparation/ready view reuses focus-content, exercise-title, instruction, text-action, Georgia editorial typography, existing sans-serif controls, paper/ink/muted/line/control/model-bg tokens and responsive scrolling. All new CSS is feature-scoped.

The mockup’s connecting copy changes to preparation copy. Its active embedded microphone session changes to a context-ready handoff with Open ChatGPT, brief paste/send/Voice instructions, secondary Copy Again and Current focus. A small static practice mark replaces the microphone because LinguaThread is not listening. There is no End Practice or mute control; ChatGPT owns the external voice session. Surrounding navigation, branding and lesson controls retain the actual repository design rather than being recreated from the mockup.

## Changed files and scope

- app/page.tsx: two imports and one wrapper around all existing current-lesson activity states.
- app/live-practice.tsx: entry, preparation, ready and error states; keeps the exercise mounted.
- app/live-practice.css: feature-scoped layout using existing tokens.
- app/live-practice-context.ts: compact dynamic selection and conversational prompt.
- app/live-practice-handoff.ts: clipboard and external-opening boundary.
- ios/LinguaThread/ContentView.swift: narrowly scoped clipboard/external-opening bridge and HTTPS navigation handling.
- ios/LinguaThread.xcodeproj/project.pbxproj: build number 8 to identify the installed update.
- tests/live-practice.test.mjs: dynamic state, bounded context, clipboard, native acknowledgement and absence of paid infrastructure checks.
- docs/live-practice.md: this implementation record.

No OpenAI API calls, API keys, endpoints, migrations, temporary credentials, billing, quotas, WebRTC, WebSocket, microphone handling or live audio playback are added. The isolated earlier paid-session draft was removed. Existing lesson generation, language stacking, audio, X-Ray, review scheduling, progress and navigation are unchanged. This handoff is not restricted by private-beta API authorization because it creates no API-funded resource.

## Validation and limits

Production build/typecheck passed. Existing package-test targets passed (4 profile tests and 59 rendered/source checks), alongside 6 targeted tests and 10 audio-first/progression regressions. ESLint has zero errors and three existing warnings in unrelated code.

Rendered local checks used installed Chrome through Playwright (Browser plugin unavailable): 430×932 light, 390×844 dark, 1366×900 desktop, plus clipboard-denial recovery. The checks verified page identity, meaningful content, no framework overlay or relevant console errors, one initiation action, dynamic copied content, copy-again, external destination routing, preserved answers/model, restored focus, scrolling and no horizontal overflow. External-destination routing was intercepted for testing; no prompt was submitted to ChatGPT.

The iOS app builds and signs under the existing bundle identity com.desmondwood.linguathread. Installation and physical handoff verification are reported separately in the completion message.

ChatGPT login, paste/send and starting Voice remain learner actions. App opening depends on installed-app association and iOS preferences; the HTTPS browser fallback is the dependable destination. Clipboard support on older web shells may require the retry/manual-copy fallback. ChatGPT account availability and Voice allowances are governed by ChatGPT, and LinguaThread neither promises a new allowance nor meters one.

Physical-device placement correction: the original entry was restricted to Reverse Recall and disappeared when the learner completed the lesson. The same single component now remains available through spoken self-comparison and completion; no progression or assessment behavior changed.

Placement-fix validation: production build passed; 66 combined existing/source and Live Practice tests passed, including the new completion placement regression. Twelve rendered checks covered reverse, spoken and completion states in mobile light, mobile dark, desktop and clipboard-denied recovery. Success cases wrote and read the actual browser clipboard, preserving Spanish and Vietnamese diacritics; copied content and learner state remained stable on return. The external ChatGPT destination was intercepted to verify routing without account interaction. Physical-device checks remain with the learner.

All-lesson availability: the single Live Practice component now wraps every current-lesson stage, including listening, transcript, vocabulary, recall, sentence inspection, grammar, target production, mastery, reverse recall, spoken practice and completion. It remains a lesson action, with no new navigation destination. The current stage and lesson still supply dynamic context; returning preserves the mounted activity.

All-stage validation: production build and 80 automated checks passed. Forty-four rendered web scenarios covered all eleven lesson stages across mobile light, mobile dark, desktop and clipboard-denied recovery. Success cases used real clipboard writes/reads, retained meaningful diacritics, preserved learner state and restored the activity after returning. One Start Live Practice entry and one ready-state Open ChatGPT action were verified in every scenario.

## Personal ChatGPT plugin trial (build 10)

The optional `PERSONAL_PRACTICE` Swift compilation condition enables an owner-private ChatGPT Sites connection only in the developer's iPhone test build. Standard builds and ordinary web users retain the existing clipboard handoff. The Site is a separate private connection service, not a replacement LinguaThread app or learner-state store.

The native shell opens the connection's own authenticated page once. Sites manages ChatGPT sign-in and the plugin's OAuth connection. No ChatGPT tokens, passwords, API keys or bypass credentials are embedded in the app. The page's WK bridge accepts only its exact HTTPS main-frame origin. During Start Live Practice, the same existing compact capsule is copied and, when connected, sent through the Site's authenticated same-origin request. Sharing is bounded to four seconds; only an affirmative save acknowledgement changes ready-state instructions. Failure preserves the clipboard handoff. The Personal connection link appears only in the personal native build and allows reconnection.

The private Site exposes one read-only MCP tool, `get_current_linguathread_practice`, returning the authenticated account's latest capsule. It cannot accept another account ID or update LinguaThread. Unauthenticated reads/writes and cross-origin writes are rejected. No history is appended: a new capsule replaces the previous one. Retrieval excludes capsules older than 24 hours; expired database records are removed during the next save. This is temporary practice context, not authoritative learner state or recorded practice evidence.

For the personal build, native Open ChatGPT uses `https://chatgpt.com/#native` with universal-links-only opening first. OpenAI's published https://chatgpt.com/.well-known/apple-app-site-association explicitly describes this route as opening a new in-app conversation. No prompt parameters or automatic Voice activation are used. The existing HTTPS browser fallback remains available if iOS declines the association; that fallback does not satisfy the actual-ChatGPT-app acceptance check.

User setup: install/connect LinguaThread Personal Practice under ChatGPT Plugins → Personal → Created by you, then sign into the private connection on the iPhone with the same ChatGPT account. After preparing a lesson, open the actual ChatGPT app, choose Live Voice, and ask it to use LinguaThread Personal Practice to continue the current lesson. The personal plugin can also read the phone-prepared capsule in ChatGPT through Chrome on Mac; desktop LinguaThread continues its regular clipboard flow.

The iPhone trial is built using `SWIFT_ACTIVE_COMPILATION_CONDITIONS='DEBUG PERSONAL_PRACTICE'` and `CURRENT_PROJECT_VERSION=10`. Future signing refreshes must preserve that compilation condition to retain the trial. No paid OpenAI API calls, embedded microphone handling or changes to lesson generation, audio, progression, X-Ray or review were added.
