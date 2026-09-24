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

For Spanish and Vietnamese coverage, `audio/inventory-es-vi.json` lists the exact authored strings that can reach a Listen control. Run `scripts/generate-approved-voice-coverage.py --limit N` in the local VoxCPM2 environment; it resumes from metadata and uses the three approved synthetic reference samples. Run `scripts/package-voice-coverage.py audio/generated/voice-coverage/metadata.jsonl` to publish generated clips provisionally. Review and promote exact utterances separately. The generator encodes 128 kbps AAC for small, iOS-compatible assets while retaining the uncompressed approved audition samples.

## Licensing

VoxCPM2 code and weights are provided by OpenBMB under Apache License 2.0. Keep `audio/THIRD_PARTY_NOTICES.md` with distributed production materials and preserve upstream notices. LinguaThread-generated voice designs are original synthetic voices, not imitations of identifiable people.
