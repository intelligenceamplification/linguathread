"""Generate resumable Spanish/Vietnamese audio from the approved synthetic voices.

Generated utterances are provisional. The packager must not add reviewedAt
unless the exact clip has passed listening review.
"""

import argparse
import hashlib
import importlib.util
import json
import re
import subprocess
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

SPANISH_NUMBERS = ("cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve")
VIETNAMESE_NUMBERS = ("không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín")
SPANISH_MARKS = {
    "¿": "signo de apertura de interrogación",
    "?": "signo de cierre de interrogación",
    "¡": "signo de apertura de exclamación",
    "!": "signo de cierre de exclamación",
}


def spoken_form(language: str, text: str) -> str:
    """Give orthographic symbols a pronounceable model in their own language."""
    if len(text) == 1 and text in "0123456789":
        names = SPANISH_NUMBERS if language == "es" else VIETNAMESE_NUMBERS
        return names[int(text)]
    if language == "es" and text in SPANISH_MARKS:
        return SPANISH_MARKS[text]
    return re.sub(r"\s*[\/／·]\s*", ", ", text).strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", type=Path, default=ROOT / "audio/inventory-es-vi.json")
    parser.add_argument("--output", type=Path, default=ROOT / "audio/generated/voice-coverage")
    parser.add_argument("--limit", type=int, default=0, help="Maximum number of new clips in this run; 0 means all")
    parser.add_argument("--force", action="store_true", help="Generate replacement candidates for published keys")
    parser.add_argument("--prompt-mode", action="store_true", help="Use the approved transcript and recording as a cadence prompt")
    parser.add_argument("--attempts", type=int, default=3, help="Bounded retries for failed speech/text checks")
    parser.add_argument("--device", default="auto", choices=("auto", "cpu", "mps"))
    args = parser.parse_args()

    import imageio_ffmpeg
    import numpy as np
    import soundfile as sf
    import torch
    from voxcpm import VoxCPM
    from faster_whisper import WhisperModel
    spec = importlib.util.spec_from_file_location("quality", ROOT / "scripts/audit-voice-audio.py")
    quality = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(quality)

    args.output.mkdir(parents=True, exist_ok=True)
    inventory = json.loads(args.inventory.read_text(encoding="utf-8"))["items"]
    pack = json.loads((ROOT / "public/audio/packs/approved.json").read_text(encoding="utf-8"))
    by_id = {clip["id"]: clip for clip in pack["clips"]}
    references = {
        ("es", "male"): ROOT / "public" / by_id["es-origin-native-castilian"]["url"].lstrip("/"),
        ("es", "female"): ROOT / "public" / by_id["spanish-female-audition"]["url"].lstrip("/"),
        ("vi", "female"): ROOT / "public" / by_id["vietnamese-female-audition"]["url"].lstrip("/"),
    }
    reference_texts = {(language, voice): next(clip["text"] for clip in pack["clips"] if ROOT / "public" / clip["url"].lstrip("/") == path) for (language, voice), path in references.items()}
    published = {(clip["language"], clip["normalizedText"], clip.get("voice")) for clip in pack["clips"]}
    reviewed = {(clip["language"], clip["normalizedText"], clip.get("voice")) for clip in pack["clips"] if clip.get("reviewedAt")}
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
        and (language, item["text"], voice) not in reviewed
        and (args.force or (language, item["text"], voice) not in published)
        and (language, item["text"], voice) not in completed
    ]
    if args.limit:
        work = work[: args.limit]
    print(f"Generating {len(work)} new clips; {len(completed)} already generated", flush=True)
    if not work:
        return
    model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, device=args.device, optimize=False)
    recognizer = WhisperModel("small", device="cpu", compute_type="int8", download_root=str(ROOT / "audio/models"))
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
                speech_text = spoken_form(language, text)
                prompt = {"prompt_wav_path": str(reference), "prompt_text": reference_texts[(language, voice)]} if args.prompt_mode else {}
                for attempt in range(args.attempts):
                    attempt_seed = (seed + attempt * 104729) % (2**31 - 1)
                    torch.manual_seed(attempt_seed)
                    np.random.seed(attempt_seed)
                    wav = model.generate(text=speech_text, reference_wav_path=str(reference), cfg_value=2.0, max_len=max(100, min(1125, len(speech_text) * 6)), inference_timesteps=32 if args.prompt_mode else 20, **prompt)
                    peak = float(np.max(np.abs(wav)))
                    rms = float(np.sqrt(np.mean(np.square(wav))))
                    duration = len(wav) / model.tts_model.sample_rate
                    problem = "signal outside bounds"
                    if 0.001 < rms and 0.005 < peak < 0.999 and 0.2 < duration < 45:
                        sf.write(wav_path, wav, model.tts_model.sample_rate)
                        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path), "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(audio_path)], check=True)
                        segments, _ = recognizer.transcribe(str(audio_path), language=language, beam_size=5, condition_on_previous_text=False, temperature=0)
                        segments = list(segments)
                        transcript = " ".join(segment.text.strip() for segment in segments)
                        target, heard = quality.normalize(speech_text), quality.normalize(transcript)
                        wer = quality.distance(target.split(), heard.split()) / max(1, len(target.split()))
                        cer = quality.distance(target, heard) / max(1, len(target))
                        pace = len(target.split()) / max(.1, sum(segment.end - segment.start for segment in segments))
                        mismatch = not transcript or target != heard
                        fast = len(target.split()) >= 4 and pace > (3.4 if language == "es" else 5.0)
                        problem = f"text/pace check: {transcript!r}, pace={pace:.2f}"
                        if not mismatch and not fast:
                            seed = attempt_seed
                            break
                    print(f"RETRY {clip_id} {attempt + 1}/{args.attempts}: {problem}", flush=True)
                else:
                    raise ValueError(problem)
                row = {
                    "id": clip_id, "language": language, "voice": voice,
                    "sourceText": text, "spokenText": speech_text, "normalizedText": text,
                    "reference": str(reference.relative_to(ROOT)), "seed": seed,
                    "sampleRate": int(model.tts_model.sample_rate), "durationSeconds": duration,
                    "peak": peak, "rms": rms, "sha256": hashlib.sha256(audio_path.read_bytes()).hexdigest(),
                    "file": audio_path.name, "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "approved": False,
                    "pipelineVersion": 3, "promptMode": args.prompt_mode,
                    "qualityCheck": {"transcript": transcript, "wordErrorRate": wer, "characterErrorRate": cer, "tokensPerSecond": pace},
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
