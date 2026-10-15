# LinguaThread VoxCPM2 curriculum audio

## Isolated iPhone rebuild (2026-10-13)

Current delivery plan (2026-10-15): `audio/native-personal-scope.json` anchors the smaller seed at the user's actual A2 Unit 17 lesson. Run `scripts/scope-native-audio.py` to derive `audio/inventory-native-personal.json`. The current eight-lesson main-content window requires 138 variants / 92 playback texts. The user deferred writing-foundation audio on 2026-10-15. `scripts/run-personal-audio-rebuild.py` builds only that window; it never chains the full-library rebuild, deploys, or installs. The user explicitly deferred the complete library. Add checked later blocks incrementally through the download/cache path while preserving the full curriculum and progression.

The native catalog can refresh checked metadata, fetch an exact content-addressed asset, validate its SHA-256, and cache it. It pins the signed seed's voice reference, backend, recipe and teacher pace. The nominal 24 MB download-cache limit preserves files needed by the active/upcoming/review window; that working set can exceed the limit. Seed files are separate. Prefetch downloads current/next units and due material after session restoration, without audio playback or evidence. Cache misses never select an old voice.

`scripts/build-native-audio-pack.py --export-library audio/generated/ios-download-library` stages validated files and a download index. It does not publish them. Release must explicitly copy/deploy that checked index and its assets under `/audio/native/`, along with the native-aware hosted lesson client, before claiming working device downloads. The smaller signed seed must still contain every required control in its declared scope, and future availability must be verified independently.

The initial VoxCPM Spanish pilot was stopped following rejection of the extracted `de` clips (extra syllables/unintelligible sound). Direct Spanish-specific synthesis then passed focused user review of six pronunciation/voice-consistency benchmarks. The replacement recipe is accepted for a screened pilot; approval of a recipe never grants human review to every generated utterance. Nothing in staging has been published or installed.

The two direct `de` candidates subsequently passed user listening review. Their exact-file approvals live in `audio/listening-reviews-ios-v1.json`; stage them with `scripts/build-native-audio-pack.py --listening-review audio/listening-reviews-ios-v1.json`. Other experimental takes remain unapproved pending review. No backend-wide or corpus-wide approval is implied.

Update: all four remaining `eres`/`Soy de Indiana` benchmarks were accepted. `audio/spanish-recipe-v1.json` pins the accepted Spanish-specific model weights, male/female reference hashes and teacher pace. `scripts/run-native-spanish-batch.py --limit 30` stages a varied bounded batch, screens final WAV bytes, retries flagged variants at most three times, and rebuilds coverage. It caches each voice conditioning once per batch and resumes completed takes. The native pack and signed-build verifier reject superseded Spanish backends or recipe hashes. Only the six benchmark recordings carry human approval; generated batch clips remain provisional. Vietnamese continues through its separate approved-reference pipeline. No bulk-generation command deploys or installs.

Future Spanish batches retain hash-verified FLAC source recordings. The synthesis cache key excludes playback tempo/gain and includes the target text, voice reference, model weights and speech-generation settings. A pace-only revision can remaster those sources, then re-screen the new final bytes. Voice/text/model changes require new synthesis. Source hashes and rendering recipe hashes remain distinct; a changed recording never inherits a previous exact-file listening receipt.

`scripts/run-native-audio-rebuild.py --batch-size 100 --max-cycles 40` runs immediate local Spanish/Vietnamese work sequentially, avoiding two competing MPS speech models. It resumes verified coverage, holds failed takes, and stops at complete coverage, the batch bound, or a cycle without progress. It creates no scheduled task and never installs or publishes. Follow `audio/generated/ios-approved-v1/full-rebuild-state.json` and the per-cycle logs. The first Spanish pilot reached 29/30 screened variants; one phrase remained held for listening review after ASR split `considerarla` into `considerar la`. Pace-only cases can receive at most 25% additional slowing, followed by fresh final-byte screening; that adjustment transfers no human approval.

The iPhone rebuild is staged separately from the published mixed web pack. Its Spanish/Vietnamese playback uses only `NativeAudio/manifest.json` and bundled content-addressed files. Missing or rejected recordings fail explicitly; the native bridge refuses remote ES/VI clips and system speech synthesis for those languages. Other languages retain their existing behavior. No new voice family or pronunciation score is introduced.

1. Fetch the current published `/api/curriculum` JSON and run `node scripts/export-native-audio-inventory.mjs SNAPSHOT.json`. This enumerates actual Listen controls in all published lessons, daily practice, foundation material, anatomy, and writing exercises. It records source hashes so content changes invalidate release coverage. It does not synthesize unused X-Ray word combinations.
2. Run `python3 scripts/build-native-audio-pack.py` to stage provenance-qualified existing recordings and report missing variants. Family approval does not exempt any take from fresh screening. The new audit version checks exact text, pace, recognition uncertainty and repetition risk. Held results may be recognition errors; they are quarantined, not silently discarded or approved.
3. Re-screen retained files using `scripts/audit-voice-audio.py --metadata audio/generated/ios-approved-v1/metadata.jsonl --output audio/generated/ios-approved-v1/audit.jsonl`. New generation screens its final AAC once and preserves that hash-bound result, avoiding redundant transcription.
4. Run the bounded `scripts/run-native-audio-pilot.py` in the local synthesis environment. It uses the registered reference voices, stages 30 Spanish and 30 Vietnamese variants, preserves progress and failures, and never publishes. Check results and representative speech before scaling. `--isolated` lets a new explicit repair plan regenerate an old reviewed/published key without altering the legacy pack.
5. Build a complete checked pack with `scripts/build-native-audio-pack.py --install`. It refuses to populate Xcode resources while any required variant is missing. The build phase independently checks coverage, current inventory/voice hashes, file hashes, URL isolation, pace and screening status. An unsigned compile can use `NATIVE_AUDIO_ALLOW_STAGING=YES CODE_SIGNING_ALLOWED=NO`; that exemption never permits a signed device build.

Normal playback is the encoded teacher pace at rate 1; Slow plays the same selected file at 0.75. Exact replay keeps the same voice. Automated screening is not pronunciation certification: reported phonetic defects require hash-bound listening acceptance. Only exact reviewed assets can contribute independent assessed listening evidence; the native writing exercises mark provisional audio as supported. Keep the user's phone disconnected until release coverage and quality checks are ready for physical testing.

VoxCPM2 is a local production dependency, never an iPhone or browser runtime dependency. The app downloads only versioned clips with explicit review status. The model and its weights must not be committed or bundled.

## Reproducible production

1. Create a Python 3.10–3.12 virtual environment on Apple Silicon.
2. Install `voxcpm` and `soundfile`.
3. Run `python scripts/generate-voxcpm2.py --manifest audio/audition-manifest.json --output audio/generated/v1`.
4. Run `python scripts/validate-voxcpm2-audio.py audio/generated/v1/metadata.jsonl`.
5. Review `metadata.jsonl`, listen to every candidate, and set `approved: true` with a `reviewedAt` timestamp only after accepting its pronunciation, clarity, and pace. Generated candidates start unapproved. Voice-family approval does not waive pronunciation review.
6. Run `node scripts/package-audio-pack.mjs audio/generated/v1/metadata.jsonl public/audio/packs/v1 public/audio/packs/approved.json`.

The original audition generator uses Voice Design. The Spanish and Vietnamese coverage generators use the learner-approved synthetic samples as reference audio to keep each voice consistent; they do not clone a real person. Each record retains source and normalized text, language, model, reference or voice description, settings, seed, sample rate, duration, file hash, and generation time.

The application resolves exact NFC-normalized text and language pairs against `public/audio/packs/approved.json`. It prefers reviewed assets when present and falls back gracefully while a clip is missing. Audio-dependent evidence is accepted only after playback completes; unreviewed synthesis is recorded as supported rather than independent listening mastery.

When a phrase has reviewed male and female variants, playback chooses one variant for that lesson control and keeps it for replay. If only one reviewed variant exists, it is used alone. New clips from an approved voice family remain unreviewed until that exact utterance passes listening review; they must not receive `reviewedAt` automatically.

For Spanish and Vietnamese coverage, `audio/inventory-es-vi.json` lists the exact authored strings that can reach a Listen control. Run `scripts/generate-approved-voice-coverage.py --limit N` in the local VoxCPM2 environment; it resumes from metadata and uses the three approved synthetic reference samples. Generation checks signal quality, independently transcribes the candidate, checks text and pace, and retries failures up to three times. Slashes and middle dots become pauses while displayed curriculum text stays unchanged.

For a long rebuild, use `--defer-failed` to keep generating new keys instead of repeating known failed takes after a restart. Run a separate `--only-failed --prompt-mode` pass for those keys. Both passes preserve the same final-AAC text and pace gates; failures never enter the published pack automatically.

On the 16 GB local Mac, the native rebuild now separates Vietnamese synthesis (`--isolated --synthesis-only`) from `scripts/screen-native-vietnamese.py`. This keeps the speech generator and recognizer from competing for memory. Pending candidates are not publishable; the separate screen must finish before packaging. Existing checks are reused only for matching file hashes. Context retries are bounded, and previously failed context keys stay held. The supported MPS float32 setting is preserved: the installed model code warns that reducing GPU precision can glitch speech. Unused MPS allocations are released between utterances.

Vietnamese screening uses pinned `vinai/PhoWhisper-small` revision `a86b604c346caf7148c37512eafe783a16420adb`, converted locally to CTranslate2 int8 with file-hash provenance. A ten-clip held/control benchmark recovered three previously misrecognized targets while continuing to reject four incorrect targets. Pace comes from the active waveform span, including internal pauses and excluding padded ends, rather than recognizer timestamps. This remains content/clarity screening, not pronunciation assessment or human listening review. The benchmark grants no clip approval.

Spanish ASR may write a spoken letter name as a glyph. The checker recognizes that equivalence only inside the explicit cue `Esta es la letra …`, using standard letter names. It does not relax ordinary-word matching, remove diacritics, change writing assessment, or mark a clip human-reviewed. Contextual letter-model experiments and newly cropped words remain isolated until their complete final files pass checks; the initial two `Llevo` crops failed and remain held.

## Incremental voice coverage

`audio/voice-registry.json` is the per-language voice reference and quality-settings registry. Add a language only after its learner-approved reference recording is in the manifest. Keep Spanish male, Spanish female, and Vietnamese female separate; the absence of an approved Vietnamese male voice is intentional. `sourceReference` can pin the original reviewed recording when a published lesson copy is processed later. The approved reference's SHA-256 and generation settings form a generation signature, so changing a voice or quality setting creates a new candidate file instead of silently reusing or overwriting an older take.

Run `python3 scripts/plan-voice-coverage.py` to make `audio/generated/voice-work-plan.json`. It reports published, current-setting generated, failed, and missing variants, then prioritizes complete authored lesson phrases before vocabulary and orthographic fragments. Use the plan as `--inventory` for `scripts/generate-approved-voice-coverage.py`; `--language vi` or `--language es` limits a batch to one voice family, and `--limit N` bounds the work. Start with small samples when changing settings. Replan after publication. Short phonetic fragments often defeat general-purpose speech recognition, so route those failures to focused listening review instead of repeatedly synthesizing them. The planner and generator never mark a clip reviewed or publish it. Final AAC text/pace auditing and the packager remain mandatory, followed by listening review of representative phrases and every flagged clip. A fast transcript match is only a screening result.

Normal playback must be natural teacher speech in the encoded clip. The learner's Slow control is a separate aid and does not justify rushed Normal audio. The learner accepted the existing Castilian male accent and a pitch-preserving 0.85 tempo adjustment for Spanish male Normal playback; the voice registry encodes that adjustment for new clips. The accent's `z` sound is a valid dialect pronunciation. Keep a versioned pack so replacement can be deployed and rolled back without rebuilding the app binary.

To correct existing clips, run `python scripts/retime-voice-pack.py --version VERSION --language es --voice male --tempo 0.85`, then `python scripts/audit-retimed-voice-pack.py audio/generated/retime-VERSION-es-male`. Inspect every `review` result and repair or listen to it before publication. For provisional one or two word clips, unstable speech recognition can yield `transform-pass`; these keep provisional status and receive `needsAudioTextReview` in the published manifest. Once every item is `pass`, `transform-pass`, or explicitly `manual-pass`, run `python scripts/retime-voice-pack.py --version VERSION --language es --voice male --apply --audit audio/generated/retime-VERSION-es-male/comparison-audit.jsonl`. Put unresolved `review` IDs in a JSON array and pass `--skip-ids` to hold those original assets for targeted replacement. This creates new URLs while preserving original files and linking each derivative to its source hash. A reviewed source retains its reviewed status only after this deterministic, pitch-preserving transform and the comparison audit. The original male reference is pinned in the registry to avoid cloning from an already slowed derivative.

Run `scripts/audit-voice-audio.py --metadata audio/generated/voice-coverage/metadata.jsonl --output audio/generated/voice-coverage/audit.jsonl` to check previously generated AAC assets. Publish with `scripts/package-voice-coverage.py audio/generated/voice-coverage/metadata.jsonl --audit audio/generated/voice-coverage/audit.jsonl --version VERSION`. Only passing hashes are eligible; `--replace` permits replacement of provisional takes and protects exact reviewed recordings. The audio transcript check equates a spoken single digit with its written numeral when the recognizer substitutes one; it retains Spanish and Vietnamese diacritics. Writing assessment has its own stricter rules. Automated transcription is triage, not pronunciation review. Flagged clips require another take or listening review; no script grants `reviewedAt`.

Use the Mac GPU where available (VoxCPM selects MPS with float32); record the actual runtime in generation logs. Do not assume a sandboxed run can access GPU acceleration. Reuse approved exact clips and audit existing files before rebuilding them. The generator encodes 128 kbps AAC for small, iOS-compatible assets while retaining the uncompressed approved audition samples. Normal and Slow playback reuse the same asset at rates 1 and 0.75; no second audio library is generated for slower playback.

## Licensing

VoxCPM2 code and weights are provided by OpenBMB under Apache License 2.0. Keep `audio/THIRD_PARTY_NOTICES.md` with distributed production materials and preserve upstream notices. LinguaThread-generated voice designs are original synthetic voices, not imitations of identifiable people.

## Spanish female teaching pace

The learner approved the Spanish female voice at 10 generation steps and pitch-preserving Normal tempo 0.70 on 2026-09-29: deliberate, mindful teaching speech. Pin the original approved reference in the registry; never clone from a retimed derivative. Normal playback remains rate 1, with the separate Slow option at 0.75.

A tempo comparison only proves preservation of the source, not correctness of its pronunciation. The reported `eres` defect affected both provisional variants despite stable source-versus-derivative ASR. User-reported defective variants must be replaced and checked against their exact target text. Isolated words and phonetic contrasts need extra scrutiny; batch sampling cannot establish that every assessed utterance is reviewed.

## Reported defects and alternative forms

`audio/known-audio-defects.json` records rejected audio hashes and the reason for each rejection. Publication carries the blocked hashes into the manifest; web and iOS playback exclude these files. The incremental planner and generator treat their coverage as missing, and the packager refuses to republish them. Missing accepted replacements use the existing clearly unreviewed fallback playback, which cannot establish independent listening mastery.

Pipeline version 6 synthesizes each slash or middle-dot alternative independently, then joins the recordings with 400 ms silence before applying the voice's Normal tempo and final AAC checks. Literal separators never reach the speech model. Preserve diacritics and the displayed authored alternatives.

Exact transcription does not certify native vowels or consonants. Flagged isolated sounds and words require focused listening approval; failed synthesis remains unpublished. Voice/pacing approval and utterance review remain separate.

## Native pronunciation benchmark

An approved Spanish voice establishes native pronunciation as well as speaker identity. Timbre similarity and exact ASR transcription do not qualify a take with an English-like r or a schwa in `de`. In `eres`, require the Spanish intervocalic tap; in `de`, require a clear Spanish e vowel. Dialect variation remains acceptable. Use sufficiently varied approved Spanish reference speech and focused checks on reported consonants/vowels before releasing repaired utterances.

Reported Spanish pronunciation defects require a fresh, hash-bound listening approval before a replacement may publish, even if ASR passes. Supply `--listening-review` with a JSON `reviews` array containing each accepted candidate's SHA, language, exact text, voice, `approved: true`, reviewer, review time, and evidence of the human acceptance. Generation never creates this approval. Known rejected hashes remain permanently blocked.

## Replacement detection

The incremental planner queues provisional clips at outdated Normal tempo and alternative-form clips without the current segmented-speech generation signature. Its per-item replacement list lets the generator repair only affected variants; exact human-reviewed recordings remain protected. A published file is not automatically current just because its language and text match. Failed replacements stay in the retry queue and cannot silently restore rejected recordings.

Reported rejected variants are prioritized ahead of the bulk backlog and marked for focused listening review in the work plan. Their ASR transcript alone cannot establish pronunciation approval.

### Accepted Vietnamese CPU candidate backend (2026-10-14)

The user accepted the exact `Tôi không muốn khiến bạn cảm thấy bị phớt lờ.`
VieNeu candidate as authentic and clear. Its receipt is in
`listening-reviews-ios-v1.json`; failed benchmark words remain excluded.
`generate-native-vietnamese.py` verifies that receipt, the approved female
reference and pinned model files, then writes resumable pending candidates.
It never grants human review or publishes assets. Use the isolated cached model:

```sh
HF_HUB_CACHE="$PWD/audio/models/vieneu-hf-cache" HF_HUB_OFFLINE=1 \
  .vieneu-venv/bin/python scripts/generate-native-vietnamese.py \
  --inventory audio/generated/ios-personal-v1/missing.json --limit 150
.voxcpm-venv/bin/python scripts/screen-native-vietnamese.py \
  --work-directory audio/generated/ios-vieneu-v1
```

Only checked candidates become eligible through the existing pack builder.
Retries use `--attempt 2` or `--attempt 3` against a refreshed missing list;
never regenerate successful files or repeat failed candidates without a bound.


### Vietnamese recognizer reference implementation

Use `audit-native-vietnamese.py` through `screen-native-vietnamese.py`.
The original pinned PhoWhisper-small weights run in CPU float32 with their
no-timestamps generation mode. The converted int8 implementation produced
trailing hallucinations: controlled comparison recovered five of six full
carrier sentences with the original implementation, and all six deliberately
mismatched controls remained rejected. Evidence is under
`audio/generated/vietnamese-recognizer-reference-control`.
Do not use the converted recognizer as the release authority. Original-model
results have a separate cache identity; no old result is silently relabeled.
Exact text including diacritics, uncertainty, repetition and waveform pace
remain mandatory checks. This remains automated triage, not human review.
The accepted Vietnamese synthesis recipe is pinned in `vietnamese-recipe-v1.json`.


### Short-word repair and release authority

`generate-native-vietnamese.py --context-carrier` creates held teaching
sentences, not lesson assets. Screen parents with the original recognizer, run
`extract-checked-carrier-words.py --parents DIRECTORY`, then independently
screen the final crops. Forced alignment supplies timing only: the original
recognizer must check the full parent and the final crop without a text prompt.
Parents are always excluded by the pack builder. Failed crops remain held.
The six-word repetition and conservative-temperature pilots did not broadly
resolve tone errors, so neither is a blanket replacement recipe.

Vietnamese manifests pin `requiredAuditModel`; stale generic/converted passes
cannot override an original-model rejection. Native playback also rejects
obsolete recognizer claims. Raw Spanish ASR error rates remain visible; the
explicit letter-name/glyph notation equivalence is used consistently by the
checker and pack selector. Joined words in marked-letter names preserve every
character and diacritic. Isolated spoken sí/si is not proof of its written
accent: typing assessment still rejects si when sí is requested. No general
accent stripping or i/y or n/ñ equivalence is permitted.

English held-out reading answers use English playback. Vietnamese composition
examples use the already authored ăn, cơ, thư and đường word models; assessed
letters and learner progress stay unchanged. Export the inventory again after
any route/model change before preparing a pack.


### Delivery size and local repair scheduling

New production takes use mono AAC at 128 kbps; source WAV/FLAC masters remain
local for later pace renders. Exact human-reviewed WAV files are not silently
converted or granted review to a derivative. Final encoded bytes get their own
text/pace screening. A controlled encoding of the accepted Vietnamese sentence
reduced 276,524 bytes to 48,072 bytes (82.6%) and passed the original recognizer.
Evidence: `audio/generated/native-aac-benchmark` (excluded from release inputs).

`generate-native-spanish.py --terminal-punctuation` is a bounded repair option,
not a replacement actor. It adds a citation ending only when one is absent;
the raw cache identity includes preparation version 2, so approved masters
cannot be overwritten or mistaken for the new attempt. Spanish model processes
serialize through an OS-held lock to avoid loading two large models together.
A leftover lock filename is not evidence of a live worker.
