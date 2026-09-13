# LinguaThread VoxCPM2 curriculum audio

VoxCPM2 is a local production dependency, never an iPhone or browser runtime dependency. The app downloads only versioned, approved clips. The model and its weights must not be committed or bundled.

## Reproducible production

1. Create a Python 3.10–3.12 virtual environment on Apple Silicon.
2. Install `voxcpm` and `soundfile`.
3. Run `python scripts/generate-voxcpm2.py --manifest audio/audition-manifest.json --output audio/generated/v1`.
4. Run `python scripts/validate-voxcpm2-audio.py audio/generated/v1/metadata.jsonl`.
5. Review `metadata.jsonl`, listen to every candidate, and mark accepted candidates in a reviewed manifest. Voice-family approval does not waive pronunciation review.
6. Run `node scripts/package-audio-pack.mjs audio/generated/v1/metadata.jsonl public/audio/packs/v1 public/audio/packs/approved.json`.

The generator uses Voice Design only. It does not clone a real person. Each record retains source and normalized text, language, model, voice description, settings, seed, sample rate, duration, file hash, and generation time.

The application resolves exact NFC-normalized text and language pairs against `public/audio/packs/approved.json`. It uses an approved asset when present and falls back gracefully while a clip is missing. Audio-dependent evidence is accepted only after playback completes.

## Licensing

VoxCPM2 code and weights are provided by OpenBMB under Apache License 2.0. Keep `audio/THIRD_PARTY_NOTICES.md` with distributed production materials and preserve upstream notices. LinguaThread-generated voice designs are original synthetic voices, not imitations of identifiable people.
