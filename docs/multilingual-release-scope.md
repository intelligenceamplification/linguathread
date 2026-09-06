# Multilingual release scope

Status: NOT RELEASE READY. Updated 2026-09-06.

This is an implementation and editorial checklist, not an assertion that its contents have been authored. The user requires every offered language to support learning from scratch or from demonstrated familiarity. Do not reduce that promise to the four-expression preview, a character chart, a single placement item, or the existing CEFR course map.

## Preserve the backbone

The existing CEFR-aligned Language Path remains the progression authority. Add language-specific literacy prerequisites before the objectives that need them. Do not invent a one-to-one equivalence between CEFR levels and HSK, JLPT, TOPIK, or a universal character count.

## Required script coverage

Each row needs authored instruction, worked examples with meaning, recognition, independent production, supported recovery, delayed review, and anchor-language explanations. Script foundations are a continuing strand, not a one-time onboarding wall.

| Language | Required coverage before declaring its literacy path complete |
| --- | --- |
| English | Upper/lowercase Latin letters, word boundaries, common letter combinations, spelling patterns and exceptions, capitalization, apostrophes, punctuation, input practice. No claim of assessed pronunciation. |
| Spanish | Latin letters including ñ, accent marks and their meaning-bearing uses, ü, letter combinations, capitalization, inverted question/exclamation marks, spelling and input practice. |
| Vietnamese | Vietnamese alphabet and vowel distinctions, đ, all tone marks and combinations with vowel marks, mark placement, meaning contrasts, word/syllable boundaries, Telex or VNI keyboard practice. |
| French | Latin letters, diacritics, ç, œ and æ where relevant, elision and apostrophes, spelling patterns, capitalization, punctuation and spacing, accent entry. |
| Portuguese | Latin letters, acute/circumflex/grave accents, tilde and cedilla, spelling patterns and written contrasts; specify regional convention before accepting variants. |
| German | Latin letters, umlauts and ß, capitalization of nouns, spelling patterns and compounds, declared regional spelling variants, keyboard entry. |
| Italian | Latin letters and letters used in loans, accent marks, apostrophes, doubled letters, spelling patterns, capitalization, punctuation and input practice. |
| Mandarin Chinese | Declared simplified/traditional teaching convention, character structure and components, stroke types and order as visual literacy, radicals as useful components rather than guaranteed meanings, pinyin initials/finals and tone notation, context-specific readings, character/word distinctions, punctuation, input-method candidate selection; a reviewed character inventory tied to the entire authored course. |
| Japanese | Complete basic hiragana and katakana inventories, dakuten/handakuten, small kana and combinations, long-vowel notation, small っ/ッ, mixed-script text, particles with exceptional readings, progressive kanji and readings in context, punctuation, IME conversion; a reviewed kanji inventory tied to the authored course. |
| Korean | Basic/double consonants, basic/compound vowels, syllable-block construction, initial/final roles, final consonant clusters, spacing, word-level spelling and written changes, keyboard composition. Sound relationships may be explained, not certified by silent exercises. |
| Arabic | Declared language/register, complete letter inventory, contextual forms and joining/nonjoining behavior, right-to-left layout, diacritics, hamza forms, tāʾ marbūṭa and alif maqṣūra, word boundaries, punctuation and mixed-direction numbers/text, unvowelled reading progression, keyboard input. |
| Hindi | Devanagari independent vowels, consonants, dependent vowel signs, inherent-vowel conventions, halant and conjuncts, repha and rakār, anusvāra/chandrabindu/visarga, nukta forms, word-level spelling, numeral and punctuation conventions, keyboard composition. |
| Russian | Full Cyrillic upper/lowercase inventory, Latin lookalikes, vowel/consonant distinctions, hard/soft signs, ё and spelling conventions, stress marks as learning aids, capitalization, punctuation and keyboard input. |

This coverage list is an authoring specification requiring language-specialist review. It is not itself a complete syllabus or proof of topic coverage.

## Evidence required for each authored unit

- Stable language, unit, objective, script-convention and revision identifiers.
- Explicit prerequisites that resolve to earlier taught or demonstrated skills, with cycle detection.
- Instruction and meaningful examples before required independent work.
- Separate recognition, production and supported-practice evidence; copying or dictation never grants unaided-writing credit.
- Acceptable variants documented with reasons. A wrong answer must get a useful explanation; exact-string matching alone is insufficient for the full course.
- IME composition safety, Unicode normalization that preserves meaning-bearing distinctions, right-to-left and combining-mark rendering tests.
- Review and reassessment; no permanent mastery claim from an immediate introductory check.
- At least one qualified language editor’s recorded review of the unit and its localized explanations. Never fabricate approval.

## Engineering release gates

- All offered language routes consume their own authored content in the main lesson engine, including vocabulary, grammar, X-Ray, transformations, recall, and review. The current fixed original-course engine does not satisfy this gate.
- All selectable non-native languages have a complete literacy route and an ability-check route. Bridge familiarity is not assumed to imply literacy.
- Stack changes remain available in every major state, including foundations and completion, without deleting other stacks’ progress.
- Draft answers, assistance usage, assessment position and review state survive reload, settings visits, stack changes and course revisions. Define multi-device recovery separately from browser-local persistence.
- Selected-language immutable unit downloads, cache eviction, offline relaunch and quiet prefetch are implemented and measured. The current all-course API is not this delivery architecture.
- Entire published paths traverse without missing content, labels in the wrong language, dead ends or unsupported writing conventions.
- Physical iPhone and browser checks cover light/dark, portrait/landscape, keyboard appearance, interruption and return, and loss of connectivity. Build/source tests are not substitutes.
- Final user review occurs before publishing or replacing the installed app.

## Current evidence and outstanding work

Implemented locally: a four-expression pilot for 13 languages; draft core assessment instructions for 13 anchors; separate recognition/writing/support evidence; resumable assessment state; legacy copied-input flags do not become placement evidence; a default production route gate. Added 58 authored draft script units across all 13 languages with instruction, recognition, writing, supported recovery, prerequisites, and due-review dates. Script explanations are currently English only. These initial units and reference inventories do not constitute complete script courses.

The script preview fetches the selected language index and individual revision-keyed units, saves them locally, and prefetches the next two after opening the current unit. Cached units can be reused; offline application relaunch, cache eviction and published immutable content are not yet implemented. Draft API responses are deliberately no-store. Reviewing a completed unit preserves its earlier completion for prerequisites.

Not implemented: the complete script courses above; a full multilingual replacement for the main CEFR lesson engine; complete localized course explanations; production-grade selected-language offline delivery; independently reviewed course and placement content; final physical-device QA of the new experience. These are release blockers, not optional follow-ups.

## References

- [Council of Europe CEFR descriptors](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors): proficiency outcomes and the companion-volume framework.
- [W3C language enablement index](https://www.w3.org/TR/typography/): technical areas to verify for script layout, glyph behavior, and input. This is not a pedagogical syllabus.
