# LinguaThread product source of truth

This document governs product, curriculum, and platform decisions across the web master, iOS, macOS, Android, and future clients. When implementations differ, resolve them toward these principles rather than allowing each platform to become a separate product.

## The promise

LinguaThread is a quiet, text-first language practice. The learner opens it intentionally, returns to the right place, reads, recalls, compares, expresses, and leaves with progress preserved.

The app is a retreat from attention-seeking software. It does not depend on streak pressure, lives, leaderboards, mascots, celebratory noise, autoplay, microphone performance, or interruption-driven notifications. Notifications are absent by default. If reminders are ever introduced, they must be explicitly enabled, infrequent, silent, and easy to disable.

Audio is an optional, learner-initiated companion to visible lesson text. It must never autoplay, interrupt, gamify, or require microphone access. System text-to-speech may support beta listening practice across languages, but synthetic output is not a substitute for pronunciation review by qualified speakers. If listening reveals an answer during an independent assessment, the attempt must be recorded as supported practice.

## The learning method

LinguaThread begins with meaning the learner can already express. A native language anchors the intention; a target language develops active production; known languages may provide carefully authored structural bridges. Vocabulary, grammar, sentence anatomy, transformation, reverse recall, Expression X-Ray, and spaced review remain parts of one coherent learning cycle.

The Language Path is the curriculum authority. It follows CEFR from A1 through C2 as a scope and sequencing framework, but course completion alone must not be presented as proof of complete four-skill CEFR proficiency. The text-first app can gather strong evidence for reading, writing, grammatical control, mediation, translation, and deliberate production. Listening and spontaneous speaking require practice and assessment beyond the current product boundary.

Review is forward progress. New lessons and due review should be interleaved throughout the path; the final C2 maintenance phase deepens that rhythm rather than introducing review for the first time.

## One product, one master

- GitHub `main` contains the canonical shared application.
- Vercel is the canonical live rendering of that application.
- GitHub `curriculum-data` contains versioned published curriculum packs.
- Native clients must preserve the master product's content, behavior, visual system, and learner state.

The current iOS app is intentionally a signed `WKWebView` host for the Vercel master. This is the correct personal-beta architecture because it prevents a premature SwiftUI rewrite from creating a second lesson engine. Native code should be added only where the operating system provides a material benefit: secure account recovery, reliable local caching, network awareness, background synchronization, accessibility integration, or distribution requirements.

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
