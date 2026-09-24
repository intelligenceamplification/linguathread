"""Generate resumable Spanish/Vietnamese audio from the approved synthetic voices.

Generated utterances are provisional. The packager must not add reviewedAt
unless the exact clip has passed listening review.
"""

import argparse
import hashlib
import json
import subprocess
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", type=Path, default=ROOT / "audio/inventory-es-vi.json")
    parser.add_argument("--output", type=Path, default=ROOT / "audio/generated/voice-coverage")
    parser.add_argument("--limit", type=int, default=0, help="Maximum number of new clips in this run; 0 means all")
    args = parser.parse_args()

    import imageio_ffmpeg
    import numpy as np
    import soundfile as sf
    import torch
    from voxcpm import VoxCPM

    args.output.mkdir(parents=True, exist_ok=True)
    inventory = json.loads(args.inventory.read_text(encoding="utf-8"))["items"]
    pack = json.loads((ROOT / "public/audio/packs/approved.json").read_text(encoding="utf-8"))
    by_id = {clip["id"]: clip for clip in pack["clips"]}
    references = {
        ("es", "male"): ROOT / "public" / by_id["es-origin-native-castilian"]["url"].lstrip("/"),
        ("es", "female"): ROOT / "public" / by_id["spanish-female-audition"]["url"].lstrip("/"),
        ("vi", "female"): ROOT / "public" / by_id["vietnamese-female-audition"]["url"].lstrip("/"),
    }
    published = {(clip["language"], clip["normalizedText"], clip.get("voice")) for clip in pack["clips"]}
    metadata = args.output / "metadata.jsonl"
    completed = set()
    if metadata.exists():
        for line in metadata.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
                completed.add((row["language"], row["normalizedText"], row["voice"]))
            except (KeyError, json.JSONDecodeError):
                continue

    work = [
        (item["language"], item["text"], voice, reference)
        for item in inventory
        for (language, voice), reference in references.items()
        if language == item["language"]
        and (language, item["text"], voice) not in published
        and (language, item["text"], voice) not in completed
    ]
    if args.limit:
        work = work[: args.limit]
    print(f"Generating {len(work)} new clips; {len(completed)} already generated", flush=True)
    if not work:
        return
    model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    failures = args.output / "failures.jsonl"
    with metadata.open("a", encoding="utf-8") as log, failures.open("a", encoding="utf-8") as error_log:
        for index, (language, text, voice, reference) in enumerate(work, 1):
            identity = hashlib.sha256(f"{language}\0{voice}\0{text}".encode()).hexdigest()[:16]
            clip_id = f"{language}-{voice}-{identity}"
            seed = int(identity[:8], 16) % (2**31 - 1)
            wav_path = args.output / f"{clip_id}.wav"
            audio_path = args.output / f"{clip_id}.m4a"
            try:
                torch.manual_seed(seed)
                np.random.seed(seed)
                # A displayed slash separates alternatives; speak it as a short pause.
                speech_text = text.replace(" / ", ", ").replace(" · ", ", ")
                wav = model.generate(text=speech_text, reference_wav_path=str(reference), cfg_value=2.0, inference_timesteps=20)
                peak = float(np.max(np.abs(wav)))
                rms = float(np.sqrt(np.mean(np.square(wav))))
                duration = len(wav) / model.tts_model.sample_rate
                if not (0.001 < rms and 0.005 < peak < 0.999 and 0.2 < duration < 45):
                    raise ValueError(f"Audio signal outside acceptance bounds: peak={peak:.4f}, rms={rms:.4f}, duration={duration:.2f}")
                sf.write(wav_path, wav, model.tts_model.sample_rate)
                subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path), "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(audio_path)], check=True)
                row = {
                    "id": clip_id, "language": language, "voice": voice,
                    "sourceText": text, "spokenText": speech_text, "normalizedText": text,
                    "reference": str(reference.relative_to(ROOT)), "seed": seed,
                    "sampleRate": int(model.tts_model.sample_rate), "durationSeconds": duration,
                    "peak": peak, "rms": rms, "sha256": hashlib.sha256(audio_path.read_bytes()).hexdigest(),
                    "file": audio_path.name, "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "approved": False,
                }
                log.write(json.dumps(row, ensure_ascii=False) + "\n")
                log.flush()
                print(f"{index}/{len(work)} {clip_id}: {text[:60]}", flush=True)
            except Exception as exc:
                error_log.write(json.dumps({"id": clip_id, "text": text, "error": str(exc)}, ensure_ascii=False) + "\n")
                error_log.flush()
                print(f"FAILED {clip_id}: {exc}", flush=True)
            finally:
                wav_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
