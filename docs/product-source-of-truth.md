## Light palette correction and future naming — 2026-10-04

Build 7 retains the approved multilingual design and dark appearance, with the light background corrected to the app’s exact `--paper: #ffffff`. Current canonical artwork is in `public/brand/v3/`. A future rename changes the visible app title and its occurrences (including metadata and platform display labels); it must preserve the icon artwork, established behavior, learner data, and the rest of the approved build. The title remains separate from the icon pixels.

# LinguaThread product source of truth

This document governs product, curriculum, and platform decisions across the web master, iOS, macOS, Android, and future clients. When implementations differ, resolve them toward these principles rather than allowing each platform to become a separate product.

## Dedicated review and forward progression — 2026-10-21

The user accepted all three Gemini representative recordings (Spanish male Charon,
Spanish female Kore, Vietnamese female Kore) as better than the installed voices.
Exact hashes and approval evidence are in `audio/cloud-listening-approvals.json`;
profile references are in `audio/cloud-audio-candidates.json`. Build 12 adds those
pinned identities alongside the preserved voice families and prefers the three
accepted files for their exact texts. This is incremental integration, not a claim
that all remaining lesson recordings have been regenerated or reviewed. UI updates
and this policy-only native build synthesize zero audio.

Review is a separate, learner-initiated destination. Finishing a lesson selects the
next eligible authored lesson; it must not inject an old foundation check at a
session-count boundary. This supersedes the older every-four-sessions automatic
review rule below. Old saved automatic-review sessions are not resumed as today's
lesson. Preserve completion records and all existing evidence during this change.

The Review queue is derived from actual attempted skills in active languages,
prioritizes unresolved deficiencies, then due recall, and excludes retired edges.
Do not manufacture a generic fallback when nothing is due. A recent check cannot
immediately queue the same phrase. For the authored Spanish/Vietnamese stack,
review must include real responses in both languages, with separate directional
evidence; neither language may be merely a label beside a Spanish-only task.
Completing review never marks an unfinished lesson completed or increments the
forward-session counter. Hints, revealed models, retries and text fallback must
not become independent listening or production evidence. Continue to preserve
meaning-bearing diacritics, delayed retrieval and independent session identity.

Cloud audition setup uses a private, ignored, owner-only local credential file.
The verified Free-tier project's Gemini TTS limits on 2026-10-21 are three requests
per minute and ten per day. The worker paces real calls at 22-second intervals and
conservatively caps all reserved requests at ten per Pacific calendar day. A quota
failure stops generation; no paid fallback or automatic repeated attempts. This
supports incremental reuse, not an immediate full-library rebuild. Provider
candidates do not change approved app voices until explicitly accepted.

## Audio delivery and refresh repair — 2026-10-19

### Scalable preparation contract — 2026-10-20

The bounded workflow is documented in [audio-pipeline.md](audio-pipeline.md).
`scripts/audio_pipeline.py` reconciles existing files by exact checksum, reports
per-lesson delivery gaps, and plans small cloud auditions or missing-only two-unit
windows. It runs no models and does not publish candidates. Ordinary app releases
and signing refreshes generate zero recordings. Keep approved recordings and their
actual review metadata; never manufacture utterance approval from voice acceptance.
Cloud adapters and their candidate configuration are not an approved voice change.
Default Gemini auditions require a billing-disabled project; metered Cloud TTS is
blocked without separate explicit acceptance. No silent paid fallback is allowed.
This supersedes the older local-tools-only preparation requirement below; large
local rebuilding and a full-language gender matrix are not the current work scope.
Missing or rejected main-lesson coverage takes priority over optional snippets.
Coverage checks must include physical files and blocked/obsolete voice policies;
metadata counts alone cannot establish readiness. No microphone or pronunciation
assessment feature is authorized by this infrastructure work.

### Unit 19 availability incident

Physical-device state confirmed the learner had reached `a2-u19-2-describing-improvement-lesson` while the delivered catalog contained only Units 17–18. Rejecting legacy audio exposed this delivery gap; the listening step then prevented all progress. A playback failure must offer explicit text continuation, create no listening evidence, and never complete a review simply because audio failed. Successful audio-first items still hide the transcript until the listening response. Retrying remains available.

`scripts/publish-prepared-audio-window.py` reuses existing hash-checked recordings for at most two authored units, validates the resulting catalog with the actual Swift player admission rules, and reports uncovered texts. It loads no speech model and synthesizes nothing. Units 19–20 have 91 of 97 requested playback texts available from existing prepared files; six remain unavailable. This is partial coverage, not launch readiness. Existing current-lesson Spanish sentence recordings are available in both approved voice families. Never assume the learner remains inside an old initial seed window or claim an entire unit is audio-ready from a subset of files.

The weekly refresh shortcut was building the detached `2bf22d1` checkout in `2026-09-19/i-h/work/linguathread`: native build 1, no approved audio catalog, and fixed-speed platform speech. Refreshing from that checkout can undo newer native audio work while retaining the current hosted interface. The repaired source is `2026-06-13/polyflow/site`. Do not infer installed playback capability from the hosted interface alone.

Build 11 introduces audio contract 2. `scripts/verify-ios-audio-release.py` must pass before a refresh build and against its built `.app` before installation. It checks the player contract, native project integration, approved source pack, exact bundled manifest, file hashes, bundle identity and minimum build. The existing refresh shortcut now invokes those checks and uses the repaired source. Retain in-place installation and learner data. A stale wrapper must display an update requirement instead of consulting mixed web recordings or platform Spanish/Vietnamese speech.

Normal/Slow uses one recording at rates 1 and 0.75. Contract-2 native playback supports changes during playback, scoped to the current request. Cached audio is bounded to 24 MiB even when lesson prefetch pins files; the signed seed is additional storage. Hash/provenance checks remain necessary but do not certify pronunciation. Voice approval never implies that every generated utterance is correct.

This repair generates zero audio and does not replace voices. Further preparation remains limited to missing or explicitly rejected clips in small main-lesson packs. Ordinary UI updates and weekly signing refreshes must synthesize zero clips. Cloud candidates require a bounded benchmark and explicit acceptance before entering the approved catalog; do not silently switch providers or incur paid fallback. No microphone access, recognition, or automated pronunciation scoring is part of this task. Existing optional self-report/replay behavior is preserved.

## The promise

LinguaThread is a quiet language practice. The learner opens it intentionally, returns to the right place, listens, reads, recalls, compares, expresses, and leaves with progress preserved.

The app is a retreat from attention-seeking software. It does not depend on streak pressure, lives, leaderboards, mascots, celebratory noise, autoplay, microphone performance, or interruption-driven notifications. Notifications are absent by default. If reminders are ever introduced, they must be explicitly enabled, infrequent, silent, and easy to disable.

For audio-first lessons, learner-initiated playback precedes visible text and a sound-to-meaning response precedes transcript reveal. Other audio remains an optional companion. Audio must never autoplay, interrupt, gamify, or require microphone access. System text-to-speech may support beta listening practice across languages, but synthetic output is not a substitute for pronunciation review by qualified speakers. Unreviewed synthesis and replayed or revealed answers are supported practice, never independent listening mastery.

## The learning method

LinguaThread begins with meaning the learner can already express. A native language anchors the intention; a target language develops active production; known languages may provide carefully authored structural bridges. Vocabulary, grammar, sentence anatomy, transformation, reverse recall, Expression X-Ray, and spaced review remain parts of one coherent learning cycle.

The Language Path is the curriculum authority. It follows CEFR from A1 through C2 as a scope and sequencing framework, but course completion alone must not be presented as proof of complete four-skill CEFR proficiency. The app records reading, writing, listening, and self-reported spoken attempts separately. Reviewed audio supports independent listening evidence; spoken self-comparison is practice, not pronunciation scoring.

Review is forward progress. New lessons and due review should be interleaved throughout the path; the final C2 maintenance phase deepens that rhythm rather than introducing review for the first time.

### Progression and repetition rule

The learning path must advance through the existing authored A1–C2 sequence as the learner demonstrates its prerequisites. Review must consolidate learning without trapping the learner in elementary lessons they have already secured.

- After three independent successful retrievals of an exact phrase across separate sessions, including later delayed recall, retire that phrase from routine repetition for the demonstrated skill. Immediate repetition, copied input, hints, revealed answers, and text-supported listening do not qualify. This is a product scheduling rule, not a claim that three successes establish universal mastery.
- Revisit the underlying objective through authored variations: different vocabulary, situations, transformations, and sentence forms. Check transfer of the structure rather than repeatedly presenting the same elementary phrase as new learning.
- Keep brief, targeted review alongside forward progression. The next eligible authored lesson is the normal flow. After every four completed sessions, allow one brief due evidence check, ordered by due date, then continue forward. Open review directly at the affected listening, reading, translation, or reverse-recall exercise and finish there. When no new eligible lesson remains, schedule only due checks. Never select completed content merely because it has the lowest score; do not reopen completed introductory lessons without due evidence or silently reset the learner to A1.
- Bring a retired exact phrase back when later recall or related errors indicate a deficiency. Remediation must target the affected objective and evidence type; a lapse must not erase unrelated progress.
- Track listening, reading, writing, and spoken attempts independently. Success in translation or reading cannot retire listening or writing requirements. Preserve meaning-bearing diacritics in writing; reviewed audio is required for independent listening evidence. Spoken self-comparison remains self-reported practice, not verified pronunciation competence.
- Use demonstrated prerequisite skills, transfer, and delayed recall to determine readiness for harder material. Completed or skipped lessons, three repetitions alone, and response latency alone must not certify CEFR proficiency or automaticity.
- Preserve the latest valid saved learner state across navigation, refresh, relaunch, synchronization, language-stack changes, and curriculum revisions. An already-secured phrase such as “Soy de Indiana” must not recur as the default elementary lesson because of stale state or scheduling fallbacks.

### Next build: locked scope, in progress

User-approved on 2026-09-26; implementation was authorized by **Proceed** on 2026-09-27. No recurring or daily task is required.

1. Implement the progression and repetition rule above in the shared learning engine, using the existing authored curriculum without expanding the CEFR map. Verify retirement after qualifying successes, delayed retrieval, varied transfer practice, targeted remediation, continued advancement, independent evidence types, and persistence across sessions.
2. Complete Spanish and Vietnamese audio replacement throughout the app using the approved Spanish male and female voices and the approved Vietnamese female voice. Randomly choose an available approved Spanish variant per control and preserve it on replay. Do not substitute old voices in remaining lesson or snippet playback paths. Additional languages remain outside this build's voice-selection scope.
3. Reuse checked recordings and rebuild failed or missing takes efficiently with free local tools. Spoken alternatives must omit slash symbols, and each recording must match the intended words at clear teacher pace. Check the final encoded asset for text and pace; automatic checks do not grant pronunciation review. Preserve exact recordings already accepted through listening review.
4. Keep Normal and Slow playback available throughout the shared audio controls. Verify the completed library and the same lesson sequence on responsive mobile/desktop web and the existing portrait-only iPhone app, including launch details, uncropped text, transcript reveal, keyboard state, and audio controls. Preserve branding, learner data, writing, grammar, orthography, retrieval, and language stacking.

Lesson text and audio controls must remain separate at every phone width. All answer entry for sentence production must wrap and grow within a bounded, scrollable field so the learner can see the words and caret while composing longer statements. Navigation labels must be fully visible without clipping.

This build is complete only after the progression behavior is verified and the full required Spanish/Vietnamese audio coverage is deployed on web and usable in the existing iPhone app. Partial audio coverage or a successful build alone does not close the goal.

## One product, one master

- GitHub `main` contains the canonical shared application.
- Vercel is the canonical live rendering of that application.
- GitHub `curriculum-data` contains versioned published curriculum packs.
- Native clients must preserve the master product's content, behavior, visual system, and learner state.

The current iOS app is intentionally a signed `WKWebView` host for the Vercel master. This is the correct personal-beta architecture because it prevents a premature SwiftUI rewrite from creating a second lesson engine. Native code should be added only where the operating system provides a material benefit: secure account recovery, reliable local caching, network awareness, background synchronization, accessibility integration, or distribution requirements.

The iOS app is portrait-only on iPhone and iPad. Keep that project-level orientation constraint in future releases, and validate lesson controls, transcript reveal, audio playback, and the keyboard within portrait width.

Do not fork the lesson experience into separately maintained web and native implementations. If a fully native presentation layer is eventually justified, it must consume the same versioned curriculum contracts and learner-state APIs as every other client.

## Seamless curriculum delivery

Author and review the complete curriculum in advance; deliver it in small cached units. Published learning must never depend on live AI generation or lead into unfinished content. Fetch only the selected language realization and explanation layers. Update immutable unit revisions independently of app releases. Measure compressed selected-course size before offering whole-course offline storage; do not bundle every language into every installation.

Every published lesson should feel ready to open, but every lesson does not need to be downloaded at launch.

The present all-course curriculum response is a transitional implementation. The durable delivery model is:

1. Load a small path index containing curriculum revision, unit summaries, lesson identifiers, prerequisites, completion state, and due reviews.
2. Publish one immutable, versioned package per four-lesson unit.
3. Open cached current content immediately and revalidate quietly in the background.
4. Keep a sliding local window: previous unit, current unit, next two units, and due review material.
5. Prefetch likely next content only after the current screen is usable.
6. Record completion locally first, update the interface immediately, and synchronize idempotent progress events afterward.
7. Preserve stable lesson and objective identifiers across curriculum revisions.
8. Never display a forced course download or block ordinary progress on background synchronization.

This architecture belongs in the shared web runtime first so the browser and current native shells benefit together. Native cache and synchronization support may then strengthen the same contract without changing the lesson experience.

## Language catalog and course availability

Language identity, language availability, and curriculum availability are different states.

- A learner may record languages that are part of their life.
- A language may appear in the curated profile catalog.
- A language becomes an available target or bridge only after its complete reviewed curriculum contract is published.

The interface must never imply that selecting a profile language creates a complete course. Until additional curricula exist, Spanish remains the authored target, English the authored anchor, and Vietnamese the authored active bridge.

Avoid an N-by-N curriculum explosion. Future expansion should use:

- language-neutral communicative objective identifiers;
- one reviewed realization layer for each target language;
- one anchor explanation layer for each supported anchor language;
- optional pair-specific contrast notes where direct comparison carries unique value.

This preserves the language-stacking method without requiring a separately authored full course for every possible pair of languages.

## Curated language priorities

The curated profile catalog contains English, Spanish, Vietnamese, French, Portuguese, German, Italian, Mandarin Chinese, Japanese, Korean, Arabic, Hindi, and Russian. It is intentionally limited to languages with broad international reach or exceptional global learner demand, with Vietnamese retained as a founding language of LinguaThread.

It already includes all ten languages reported as the most studied on Duolingo in 2025: English, Spanish, French, Japanese, German, Korean, Italian, Chinese, Portuguese, and Hindi. It also contains all six official United Nations languages: Arabic, Chinese, English, French, Russian, and Spanish.

Use the following release priorities, not as judgments of cultural value, but as a practical order for curriculum investment:

1. **Established core:** English anchor, Spanish target, Vietnamese active bridge.
2. **Global expansion:** French, Mandarin Chinese, Portuguese, German, and Arabic.
3. **Strong learner demand:** Japanese, Korean, Italian, and Hindi.
4. **Additional global course:** Russian.

Vietnamese remains central even though it is not in the global top ten for learner demand. It is part of LinguaThread's founding method and a valuable demonstration of structural contrast between an inflected Romance language and an analytic, relationship-sensitive language.

Do not expand the profile catalog or visible target-course menu merely to appear comprehensive. Regional breadth is not a product objective. Add a language only when its global relevance and its complete curriculum, X-Ray content, answer acceptance, progression graph, review behavior, and native editorial review meet the same standard as the established course.

## Release gates

### Script literacy and input readiness

The complete multilingual release must satisfy [the language-specific release scope](multilingual-release-scope.md). Every offered language needs a complete from-scratch literacy route as well as placement from existing ability. Four-expression pilots, charts, and a CEFR backbone do not satisfy course completeness. Do not describe incomplete coverage as release-ready.

For every non-native language, ask: “How familiar are you with written [language]?” Offer “Start from the foundations” and “Check what I already know.” Familiarity with a spoken bridge does not imply script literacy. Keep foundations accessible after placement, and keep a stack-change action available throughout the experience. Switching stacks must preserve each stack’s lesson position and unfinished work.

Placement must distinguish recognition, independent production, copied input, and assisted/dictated input. A short introductory check cannot certify complete script mastery. Dictation is optional convenience, not proof of spelling or keyboard readiness. Do not infer input method from browser text events. Store separate evidence before using placement to skip curriculum prerequisites.

Coherence is a release gate: prompts must be understandable in the learner’s anchor language; no exercise may demand an untaught prerequisite; no completion label may overstate the evidence; accepted variants must match the declared writing convention. Check these properties across onboarding, foundations, lessons, feedback, review, stack changes, and resumed sessions.

- Assess reading familiarity separately from speaking familiarity and typing readiness for each learning or bridge language. Skip native-language script instruction by default, with optional help.
- Integrate small, meaningful script lessons before exercises that require them: letters and diacritics for Latin scripts; Hangul blocks; kana and kanji; Arabic direction and joined forms; Devanagari signs and conjuncts; Cyrillic; and Mandarin characters with pinyin and tone marks.
- Reading aids remain available on demand. Romanization is not evidence of character mastery. Recognition, typing, handwriting, and pronunciation are distinct skills; the silent app must not claim to assess pronunciation.
- Prompt for keyboard setup before first required typing, not at every launch. Prefer system keyboards; offer a practice entry, an already-ready path, and help. Do not claim installed-keyboard detection where unavailable.
- Preserve work before learners leave for system settings. Keyboard help must be platform-specific and reviewed against official instructions. Never install a keyboard or change system settings automatically.
- CEFR is a proficiency framework, not a universal character inventory. Language-specific literacy progression needs editorial review and must not imply automatic equivalence with other exams.
- These requirements apply to the shared runtime on web and iOS. Experimental previews are not published course availability.

A language course is ready only when:

- every published lesson validates;
- every prerequisite resolves;
- every exercise has a completion and recovery path;
- progress survives closing, reconnection, and curriculum revision;
- due review is interleaved without blocking new learning;
- the complete path can be traversed automatically in testing;
- a qualified editor has reviewed natural expression and cultural context;
- the live client fetches only nearby content while keeping the next lesson perceptibly immediate.

## Evidence behind the language catalog

- [Duolingo 2025 Language Report](https://blog.duolingo.com/2025-duolingo-language-report/)
- [United Nations official languages](https://www.un.org/en/our-work/official-languages)
- [U.S. State Department language training estimates](https://2009-2017.state.gov/documents/organization/247092.pdf)

## Progression persistence (2026-09-30)

Legacy completed-session snapshots cannot reopen completed lessons on launch. Newly scheduled targeted reviews can resume across reloads. Skips are navigation events, not failed responses. A corrected answer after a failed attempt is supported practice; only subsequent independent recall resolves a demonstrated lapse. Exact-phrase retirement applies per retrieval edge, so a bridge-language or reading failure does not invalidate demonstrated Spanish writing. Saved completion unlocks the existing authored path without certifying CEFR proficiency.

### Progression recovery (2026-10-01)

Every skip path must persist deferral so the scheduler cannot restart the same unfinished lesson automatically. Independent target-language production permits studying the next authored prerequisite-dependent lesson, while skipped bridge or other skill work remains incomplete. This readiness decision does not certify stable mastery or CEFR proficiency. A checked independent answer in the current session must survive process reloads: resume the pending bridge or the continuation control, not the same empty target-language question.
# Approved multilingual icon baseline — 2026-10-04

The user approved the sculpted multilingual icon containing traditional Chinese 語, Korean 말, Vietnamese tiếng, and a connecting ribbon. The name LinguaThread sits beneath the icon and is not baked into its artwork. Preserve the correct character strokes and Vietnamese diacritics. Canonical light and dark assets are `public/brand/v2/icon-{light,dark}-1024.png`, copied identically into the existing iOS asset catalog. The web uses the same artwork in responsive sizes, an appearance-aware favicon, and a 1200×630 sharing preview. iOS build 6 locks in this baseline; later builds must retain these assets unless the user approves another design.
## iPhone audio overhaul — 2026-10-13

The user authorized a new isolated Spanish/Vietnamese instructional audio pack, retaining only proven recordings and using the approved Spanish male/female and Vietnamese female references. Voice-family acceptance is not approval of every generated utterance. Re-screen existing clips and hold unintelligible, mismatched, uncertain, or reported defective takes; automated transcription cannot certify pronunciation. The iPhone must not fall back to legacy packs or platform voices for these two languages. Normal/Slow reuse the same selected clip at rates 1/0.75. Require complete authored-control coverage and a validated native pack before a signed install; connect the physical phone only when ready for that test. Web audio overhaul remains deferred. Preserve the current Nuevo Flow title, approved multilingual icon, progression, saved learner data, and curriculum.

The user rejected both extracted `de` candidates for extra syllables and unintelligible sound. They remain blocked by exact file hash. Bulk generation is paused pending a successful direct Spanish pronunciation benchmark using approved reference recordings. A Spanish-specific backend is an isolated experiment; neither its outputs nor altered voice identity become approved automatically. Do not compensate for wrong sounds by slowing playback.

The direct Spanish-specific male/female `de` candidates were accepted on 2026-10-13 ("Nailed it!", "Es perfecto"). Exact approved hashes and listening evidence are recorded in `audio/listening-reviews-ios-v1.json`. This approves those two recordings; `eres` and full-phrase voice consistency must still be checked before scaling the new recipe.

The same day, the user accepted all four male/female `eres` and `Soy de Indiana` benchmarks. The six exact recordings are approved; the generation recipe is pinned in `audio/spanish-recipe-v1.json`. Native Spanish candidates must match that backend and recipe hash. Previous Spanish synthesis output is excluded from the new native pack even if it came from an earlier approved voice family. New utterances remain provisional until screened and must not inherit human review from the six benchmarks. Vietnamese keeps its accepted female reference and separate generation backend.

The user also explicitly approved the Spanish female `A la luz de los datos, la estrategia parece eficaz, aunque sería prematuro considerarla definitiva.` recording, SHA-256 `4f9c32f01c7a8c1d4d484c72d1a390be7e865054a9b318eabaeb5abb4be40cd7`, after focused listening review on 2026-10-13. This resolves that exact take's ASR clitic-segmentation flag without weakening text checks for other recordings. The first 30-variant pilot now has 29 screened variants and one human-approved variant.

## Personal audio footprint and continued progression — 2026-10-13

### Scope correction — 2026-10-15

The user explicitly excluded rebuilding the full Spanish/Vietnamese library from this update. Prepare and validate the initial personal lesson window, with reusable checked download/cache delivery for later lesson blocks. Do not chain a full-library rebuild after the personal pack or make thousands of regenerated clips a prerequisite for this build. Preserve all authored lessons and learner progression. Later blocks are added incrementally; do not claim that ungenerated or unavailable audio is already delivered. Stop when the update is ready and ask the user to connect the iPhone then.

The user approved a smaller initial iPhone installation for Spanish and Vietnamese, with English as the existing meaning anchor. The screenshot identifies the current lesson as `a2-u17-4-a-learning-intention-lesson` (A2 Unit 17): `Practico cada día para que las palabras salgan con naturalidad.` The initial audio scope includes Units 17–18 and the existing Spanish/Vietnamese writing foundations: 352 unique texts, 481 voice variants. It does not change the curriculum, language-stack settings, learner progress, title Nuevo Flow, icon, or portrait constraint.

The user explicitly requires enough audio to continue advancing. The smaller installation is not a cap on the lesson library. Prioritize the personal window, then continue preparing the complete authored Spanish/Vietnamese audio library (5,047 variants). Future checked recordings are served separately, downloaded ahead for the current/next units and due retrieval, and cached with file-hash verification. The signed seed pins accepted voice references, backend and recipe; remote assets must satisfy those same constraints. No old voice or platform-speech fallback is permitted for native Spanish/Vietnamese. Prefetch is silent and creates no learning evidence. It starts only after restoring the saved learner session.

The download/cache integration is not deployed or installed yet. Readiness requires complete initial-window coverage, tested download/cache behavior, and verified availability of later lesson blocks; incomplete future audio must not be represented as uninterrupted coverage. Keep source recordings and reviewed receipts. Scoped completeness must be validated against the scope policy and full authored inventory, not achieved by silently dropping missing controls.

### Rebuild and release checks — 2026-10-14

Current/upcoming authored lessons precede writing foundations in the generation queue; ordering never removes required recordings. The local runner keeps the Mac awake while processing and stops with an explicit repair/review state when a scope remains incomplete. It must not advance to the full-library stage while reporting an incomplete initial scope as ready.

Listening quality is taken from the recording that actually finished playback. A separate catalog lookup cannot establish reviewed listening evidence. Real Swift cache tests with a controlled HTTP transport verify shared downloads, file hashes, offline reuse, cached metadata, and rejection of a previously cached recording after it is blocked. These checks are not physical-iPhone playback proof.

Two published A2 Unit 18 vocabulary entries mistakenly contain English editorial labels (`repair intention`, `intention contrast`) as Spanish words. The narrowly scoped runtime corrections use `manera` and `quería`, respectively, both already present in their target sentences. The export uses the same corrections as the curriculum endpoint; lesson IDs, sentence prompts, course size, and saved progress are preserved. A later authored correction takes precedence.

This work remains unreleased until audio coverage and deployment/device checks pass. The approved installed build must not be replaced with an incomplete staging pack.

The Spanish/Vietnamese writing controls now distinguish an assessed written form from its audio model. Spanish alphabet and marked-vowel entries use their letter names; Vietnamese entries with authored word examples reuse those examples for the revealed model. The audio model is shown explicitly when it differs from the assessed form. Invalid spelling distractors in the legacy Spanish/Vietnamese visual script exercises remain selectable but are not spoken as instructional models. The correct form retains playback, and the sound, composition, and input directions remain intact. Other language controls are unchanged.

The resulting personal-window inventory is 284 audio texts / 405 voice variants; the full Spanish/Vietnamese inventory is 3,323 texts. This reduction follows the actual corrected controls, not removal of missing recordings from the manifest. Exact writing assessment, inventory forms, lesson IDs, and all 288 authored course lessons are retained. The exporter and scoped verifier derive coverage from the same runtime models.

Spanish/Vietnamese writing content is version 6 so cached version-5 units cannot preserve obsolete audio controls. Progress schema and skill IDs are unchanged. Native release review dates come only from exact-file current-release listening receipts; historical mixed-pack review flags cannot manufacture reviewed listening evidence. Voice-family provenance remains required even for retained clips.

### Short-utterance quality investigation

The Vietnamese quality checker now uses the pinned native-language PhoWhisper model described in `audio/README.md`. A held/control benchmark demonstrated recognition improvements while retaining rejection of incorrect speech. Timing is measured independently from waveform activity because the native recognizer's short-clip timestamps can be inaccurate. Neither change grants human listening review or pronunciation mastery.

Spanish letter controls retain the reviewed standalone `de`; other letter models use the explicit cue `Esta es la letra …`, shown in the interface exactly as spoken. The assessed glyph and its existing skill ID remain unchanged. This addresses unstable isolated-name synthesis without hiding added speech or changing writing assessment. The scoped requirement remains 284 utterances / 405 voice variants; the current full inventory contains 3,324 texts.

The initial two `Llevo` crops from checked same-voice sentences failed standalone checks and remain held. A free, Vietnamese-specific VieNeu-TTS CPU cloning experiment is isolated under `audio/generated/vietnamese-backend-benchmark`; its failed samples are excluded from release discovery, and only the exact accepted sentence has been promoted to checked metadata. The approved female reference is unchanged. On 2026-10-14 the user accepted its complete sentence sample as authentic and clear (exact hash in listening-reviews-ios-v1.json). This accepts same-reference voice consistency for further checked generation; the failed short-word samples remain held. Existing checked Vietnamese recordings remain eligible. No experimental candidate is released without its own content and pace checks.


The 2026-10-14 Vietnamese screening comparison identified trailing transcript
hallucinations in the converted int8 recognizer. The release checker now uses
the original pinned full-precision PhoWhisper-small implementation and its
no-timestamps generation configuration, with a distinct audit cache identity.
A controlled six-sentence comparison recovered five exact carrier sentences;
all six deliberately mismatched controls were rejected. Retained and pending
Vietnamese candidates must be re-screened with this implementation. This does
not approve failed audio or confer human pronunciation review.


Audio routing corrections preserve assessed writing: English reading-transfer
answers retain their English voice, and Vietnamese composition models use
existing authored examples (ăn, cơ, thư, đường) while still assessing the
requested glyphs and their marks. These corrections change playable audio
requirements, not lesson IDs, learning-path scope or mastery evidence.
Spanish audio triage recognizes explicit letter-name/glyph notation and the
isolated sí/si segment homophony; raw transcription metrics remain recorded.
Writing assessment still distinguishes sí/si, n/ñ, all vowel accents and all
Vietnamese tone/shape marks. A newer authoritative Vietnamese rejection cannot
be overridden by an older cached pass. The native manifest and playback policy
pin the reference recognizer identity for automated Vietnamese checks.

### Main-lesson audio scope — 2026-10-15

The user subsequently directed: leave writing-foundation audio alone for now and focus on the main lesson content. The personal seed therefore includes the eight authored lessons in Units 17–18, without the separate writing-foundation audio inventory. This is an explicit product scope change, not a relaxation of clip validation. All main-lesson controls in those lessons remain required: 92 playback texts / 138 voice variants. Writing-foundation experiments begun during this scope discussion were reverted. Preserve existing writing assessment and learner progress. Future lesson packs use the same checked download/cache delivery; do not restart the complete-library rebuild.

The five fragile vocabulary audio requests (`Llevo`, `corregir`, `haberte hablado`, and Vietnamese `cách` / `sửa`) reuse existing authored context models in the native player. The control displays “Listen in context” and the exact spoken sentence or phrase; it never silently plays added words. Vocabulary, translation and writing answers remain unchanged. Displayed-context playback cannot count as independent listening evidence. The inventory exporter applies the same routing helper as the actual player; all eight lessons’ required controls remain covered. Failed isolated takes remain excluded.


### Review refinement and launch scope — 2026-10-22

Review is a separate destination with two explicit groups: needs strengthening and due for recall. Each topic shows its authored level, unit, skill and bounded exercise plan. Topic and reason remain visible during practice; directions identify the language to produce. A completion summary distinguishes independent recall, supported practice and revealed models. Later steps reuse the same meaning for guided stacking and record supported evidence, never fresh independent mastery. Review must not advance, reset or block the main lesson. Listening still hides its transcript until an attempt/reveal; text fallback cannot earn listening evidence. Preserve accented writing and spacious, growing answer fields.

The selected launch learning languages are Spanish, Vietnamese, French, Mandarin Chinese, Korean and Arabic, with English available as a meaning anchor. New language choices use this list; historical selections and learning evidence remain readable. This is a launch scope decision, not a claim that every listed language has a complete approved communication course. Spanish has the authored main course; Vietnamese has the authored bridge and writing foundations. The remaining launch languages still require course/editorial/audio readiness work before release.

Immediate audio work is **Spanish and Vietnamese only**. Generate at most the available ten free requests per Pacific day, one job at a time. Prioritize full lesson sentences in a small two-unit window using the accepted cloud profiles. Reuse exact generated files indefinitely. Do not regenerate on app builds, generate the full library, expand to the other four launch languages, or equate technical audio checks with human pronunciation approval.


On 2026-10-22, the user rejected the exact Vietnamese cloud take “Tôi có nên xin thêm ý kiến không?” for mispronouncing nên (SHA 8cb9c615339aeb5b257bb9ba212f5970a23cf2ddbc2b5ed3e2a61427031c9db8). This file is blocked, not the entire Vietnamese female profile. The other nine batch recordings were explicitly accepted, including three Spanish takes flagged by ASR. Preserve those raw screening results; human acceptance resolves these exact-file flags without relaxing writing accents or global screening rules. No retry generation occurred; the daily budget remains ten requests used.
