# LinguaThread product source of truth

This document governs product, curriculum, and platform decisions across the web master, iOS, macOS, Android, and future clients. When implementations differ, resolve them toward these principles rather than allowing each platform to become a separate product.

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
