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

Run `scripts/audit-voice-audio.py --metadata audio/generated/voice-coverage/metadata.jsonl --output audio/generated/voice-coverage/audit.jsonl` to check previously generated AAC assets. Publish with `scripts/package-voice-coverage.py audio/generated/voice-coverage/metadata.jsonl --audit audio/generated/voice-coverage/audit.jsonl --version VERSION`. Only passing hashes are eligible; `--replace` permits replacement of provisional takes and protects exact reviewed recordings. Automated transcription is triage, not pronunciation review. Flagged clips require another take or listening review; no script grants `reviewedAt`.

Use the Mac GPU where available (VoxCPM selects MPS with float32); record the actual runtime in generation logs. Do not assume a sandboxed run can access GPU acceleration. Reuse approved exact clips and audit existing files before rebuilding them. The generator encodes 128 kbps AAC for small, iOS-compatible assets while retaining the uncompressed approved audition samples. Normal and Slow playback reuse the same asset at rates 1 and 0.75; no second audio library is generated for slower playback.

## Licensing

VoxCPM2 code and weights are provided by OpenBMB under Apache License 2.0. Keep `audio/THIRD_PARTY_NOTICES.md` with distributed production materials and preserve upstream notices. LinguaThread-generated voice designs are original synthetic voices, not imitations of identifiable people.
