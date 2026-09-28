# LinguaThread VoxCPM2 curriculum audio

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

## Incremental voice coverage

`audio/voice-registry.json` is the per-language voice reference and quality-settings registry. Add a language only after its learner-approved reference recording is in the manifest. Keep Spanish male, Spanish female, and Vietnamese female separate; the absence of an approved Vietnamese male voice is intentional. `sourceReference` can pin the original reviewed recording when a published lesson copy is processed later. The approved reference's SHA-256 and generation settings form a generation signature, so changing a voice or quality setting creates a new candidate file instead of silently reusing or overwriting an older take.

Run `python3 scripts/plan-voice-coverage.py` to make `audio/generated/voice-work-plan.json`. It reports published, current-setting generated, failed, and missing variants, then prioritizes complete authored lesson phrases before vocabulary and orthographic fragments. Use the plan as `--inventory` for `scripts/generate-approved-voice-coverage.py`; `--language vi` or `--language es` limits a batch to one voice family, and `--limit N` bounds the work. Start with small samples when changing settings. Replan after publication. Short phonetic fragments often defeat general-purpose speech recognition, so route those failures to focused listening review instead of repeatedly synthesizing them. The planner and generator never mark a clip reviewed or publish it. Final AAC text/pace auditing and the packager remain mandatory, followed by listening review of representative phrases and every flagged clip. A fast transcript match is only a screening result.

Normal playback must be natural teacher speech in the encoded clip. The learner's Slow control is a separate aid and does not justify rushed Normal audio. The learner accepted the existing Castilian male accent and a pitch-preserving 0.85 tempo adjustment for Spanish male Normal playback; the voice registry encodes that adjustment for new clips. The accent's `z` sound is a valid dialect pronunciation. Keep a versioned pack so replacement can be deployed and rolled back without rebuilding the app binary.

To correct existing clips, run `python scripts/retime-voice-pack.py --version VERSION --language es --voice male --tempo 0.85`, then `python scripts/audit-retimed-voice-pack.py audio/generated/retime-VERSION-es-male`. Inspect every `review` result and repair or listen to it before publication. For provisional one or two word clips, unstable speech recognition can yield `transform-pass`; these keep provisional status and receive `needsAudioTextReview` in the published manifest. Once every item is `pass`, `transform-pass`, or explicitly `manual-pass`, run `python scripts/retime-voice-pack.py --version VERSION --language es --voice male --apply --audit audio/generated/retime-VERSION-es-male/comparison-audit.jsonl`. Put unresolved `review` IDs in a JSON array and pass `--skip-ids` to hold those original assets for targeted replacement. This creates new URLs while preserving original files and linking each derivative to its source hash. A reviewed source retains its reviewed status only after this deterministic, pitch-preserving transform and the comparison audit. The original male reference is pinned in the registry to avoid cloning from an already slowed derivative.

Run `scripts/audit-voice-audio.py --metadata audio/generated/voice-coverage/metadata.jsonl --output audio/generated/voice-coverage/audit.jsonl` to check previously generated AAC assets. Publish with `scripts/package-voice-coverage.py audio/generated/voice-coverage/metadata.jsonl --audit audio/generated/voice-coverage/audit.jsonl --version VERSION`. Only passing hashes are eligible; `--replace` permits replacement of provisional takes and protects exact reviewed recordings. The audio transcript check equates a spoken single digit with its written numeral when the recognizer substitutes one; it retains Spanish and Vietnamese diacritics. Writing assessment has its own stricter rules. Automated transcription is triage, not pronunciation review. Flagged clips require another take or listening review; no script grants `reviewedAt`.

Use the Mac GPU where available (VoxCPM selects MPS with float32); record the actual runtime in generation logs. Do not assume a sandboxed run can access GPU acceleration. Reuse approved exact clips and audit existing files before rebuilding them. The generator encodes 128 kbps AAC for small, iOS-compatible assets while retaining the uncompressed approved audition samples. Normal and Slow playback reuse the same asset at rates 1 and 0.75; no second audio library is generated for slower playback.

## Licensing

VoxCPM2 code and weights are provided by OpenBMB under Apache License 2.0. Keep `audio/THIRD_PARTY_NOTICES.md` with distributed production materials and preserve upstream notices. LinguaThread-generated voice designs are original synthetic voices, not imitations of identifiable people.
