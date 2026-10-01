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
    if len(text) == 1 and text in "0123456789" and language in ("es", "vi"):
        names = SPANISH_NUMBERS if language == "es" else VIETNAMESE_NUMBERS
        return names[int(text)]
    if language == "es" and text in SPANISH_MARKS:
        return SPANISH_MARKS[text]
    return re.sub(r"\s*[\/／·]\s*", ", ", text).strip()


def speech_segments(language, text):
    return [spoken_form(language, part.strip()) for part in re.split(r"[/／·]", text) if part.strip()]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", type=Path, default=ROOT / "audio/inventory-es-vi.json")
    parser.add_argument("--output", type=Path, default=ROOT / "audio/generated/voice-coverage")
    parser.add_argument("--limit", type=int, default=0, help="Maximum number of new clips in this run; 0 means all")
    parser.add_argument("--force", action="store_true", help="Generate replacement candidates for published keys")
    parser.add_argument("--defer-failed", action="store_true", help="Skip previously failed keys until a dedicated retry pass")
    parser.add_argument("--only-failed", action="store_true", help="Retry only previously failed keys")
    parser.add_argument("--prompt-mode", action="store_true", help="Use the approved transcript and recording as a cadence prompt")
    parser.add_argument("--attempts", type=int, default=3, help="Bounded retries for failed speech/text checks")
    parser.add_argument("--device", default="auto", choices=("auto", "cpu", "mps"))
    parser.add_argument("--inference-timesteps", type=int, help="Override the reviewed per-voice diffusion steps for a small audition only")
    parser.add_argument("--voice-registry", type=Path, default=ROOT / "audio/voice-registry.json")
    parser.add_argument("--language", help="Generate one reviewed language family at a time")
    args = parser.parse_args()
    if args.defer_failed and args.only_failed:
        parser.error("--defer-failed and --only-failed are mutually exclusive")
    if args.inference_timesteps is not None and not 4 <= args.inference_timesteps <= 30:
        parser.error("--inference-timesteps must be between 4 and 30")

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
    registry = json.loads(args.voice_registry.read_text(encoding="utf-8"))
    references = {}
    reference_texts = {}
    voice_settings = {}
    for entry in registry["voices"]:
        key = (entry["language"], entry["voice"])
        if key in references:
            raise ValueError(f"Duplicate voice: {key}")
        clip = entry.get("sourceReference") or by_id[entry["referenceClipId"]]
        if clip["language"] != entry["language"] or not clip.get("reviewedAt"):
            raise ValueError(f"Voice reference must be learner-reviewed in its language: {key}")
        reference_path = ROOT / "public" / clip["url"].lstrip("/")
        if hashlib.sha256(reference_path.read_bytes()).hexdigest() != clip["sha256"]:
            raise ValueError(f"Voice reference changed: {reference_path}")
        references[key] = reference_path
        reference_texts[key] = clip["text"]
        steps = args.inference_timesteps or entry["inferenceTimesteps"]
        if not 4 <= steps <= 30:
            raise ValueError(f"Invalid inference steps for {key}: {steps}")
        tempo = float(entry.get("normalTempo", 1.0))
        if not 0.5 <= tempo <= 1.25:
            raise ValueError(f"Invalid Normal tempo for {key}: {tempo}")
        voice_settings[key] = {"inferenceTimesteps": steps, "referenceSha256": clip["sha256"], "normalTempo": tempo}
    unsupported = {item["language"] for item in inventory} - {language for language, _ in references}
    if unsupported:
        raise ValueError(f"Inventory has no approved voice family: {sorted(unsupported)}")
    if args.language and args.language not in {language for language, _ in references}:
        raise ValueError(f"No learner-approved voice for {args.language}")
    blocked = set(pack.get("blockedAudioSha256", []))
    published = {(clip["language"], clip["normalizedText"], clip.get("voice")) for clip in pack["clips"] if clip["sha256"] not in blocked}
    reviewed = {(clip["language"], clip["normalizedText"], clip.get("voice")) for clip in pack["clips"] if clip.get("reviewedAt") and clip["sha256"] not in blocked}
    metadata = args.output / "metadata.jsonl"
    failures = args.output / "failures.jsonl"
    completed = set()
    if metadata.exists():
        for line in metadata.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
                if row.get("generationSignature"):
                    completed.add((row["language"], row["normalizedText"], row["voice"], row["generationSignature"]))
            except (KeyError, json.JSONDecodeError):
                continue
    failed_ids = set()
    if failures.exists():
        for line in failures.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
                failed_ids.add((row["id"], row.get("generationSignature")))
            except (KeyError, json.JSONDecodeError):
                continue

    def was_failed(language: str, text: str, voice: str) -> bool:
        identity = hashlib.sha256(f"{language}\0{voice}\0{text}".encode()).hexdigest()[:16]
        clip_id = f"{language}-{voice}-{identity}"
        return ((clip_id, signature(language, voice)) in failed_ids
                or (args.only_failed and args.prompt_mode and
                    (clip_id, signature(language, voice, prompt_mode=False)) in failed_ids))

    def signature(language: str, voice: str, prompt_mode=None) -> str:
        settings = {**voice_settings[(language, voice)], "promptMode": args.prompt_mode if prompt_mode is None else prompt_mode,
                    "pipelineVersion": 6, "model": "openbmb/VoxCPM2", "cfgValue": 2.0}
        return hashlib.sha256(json.dumps(settings, sort_keys=True).encode()).hexdigest()[:12]

    work = [
        (item["language"], item["text"], voice, reference, signature(language, voice))
        for item in inventory
        for (language, voice), reference in references.items()
        if language == item["language"]
        and (args.language is None or language == args.language)
        and ("neededVariants" not in item or voice in item["neededVariants"])
        and (language, item["text"], voice) not in reviewed
        and (args.force or voice in item.get("replacementVariants", []) or (language, item["text"], voice) not in published)
        and (language, item["text"], voice, signature(language, voice)) not in completed
        and (not args.defer_failed or not was_failed(language, item["text"], voice))
        and (not args.only_failed or was_failed(language, item["text"], voice))
    ]
    if args.limit:
        work = work[: args.limit]
    print(f"Generating {len(work)} new clips; {len(completed)} already generated", flush=True)
    if not work:
        return
    # Decode reviewed AAC references once before the expensive model load.
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    prompt_references = {}
    for key in {(language, voice) for language, _, voice, _, _ in work}:
        reference = references[key]
        if reference.suffix.lower() not in (".wav", ".flac"):
            decoded = args.output / f"reference-{voice_settings[key]['referenceSha256'][:16]}.wav"
            if not decoded.exists():
                subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(reference), str(decoded)], check=True)
            reference = decoded
        prompt_references[key] = reference
    model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, device=args.device, optimize=False)
    recognizer = WhisperModel("small", device="cpu", compute_type="int8", download_root=str(ROOT / "audio/models"))
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    prompt_caches = {}
    for key in {(language, voice) for language, _, voice, _, _ in work}:
        reference = prompt_references[key]
        prompt_caches[key] = model.tts_model.build_prompt_cache(
            reference_wav_path=str(reference),
            prompt_wav_path=str(reference) if args.prompt_mode else None,
            prompt_text=reference_texts[key] if args.prompt_mode else None,
        )
    with metadata.open("a", encoding="utf-8") as log, failures.open("a", encoding="utf-8") as error_log:
        for index, (language, text, voice, reference, generation_signature) in enumerate(work, 1):
            identity = hashlib.sha256(f"{language}\0{voice}\0{text}".encode()).hexdigest()[:16]
            clip_id = f"{language}-{voice}-{identity}"
            seed = int(identity[:8], 16) % (2**31 - 1)
            wav_path = args.output / f"{clip_id}-{generation_signature}.wav"
            audio_path = args.output / f"{clip_id}-{generation_signature}.m4a"
            try:
                speech_text = spoken_form(language, text)
                for attempt in range(args.attempts):
                    attempt_seed = (seed + attempt * 104729) % (2**31 - 1)
                    torch.manual_seed(attempt_seed)
                    np.random.seed(attempt_seed)
                    # Generate alternatives independently: never send their separator to TTS.
                    alternatives = speech_segments(language, text)
                    pieces = []
                    for part in alternatives:
                        waveform, _, _ = model.tts_model.generate_with_prompt_cache(
                            target_text=part, prompt_cache=prompt_caches[(language, voice)], cfg_value=2.0,
                            max_len=max(100, min(1125, len(part) * 6)),
                            inference_timesteps=voice_settings[(language, voice)]["inferenceTimesteps"], retry_badcase=False,
                        )
                        if pieces:
                            pieces.append(np.zeros(round(model.tts_model.sample_rate * 0.4), dtype=np.float32))
                        pieces.append(waveform.squeeze(0).cpu().numpy())
                    wav = np.concatenate(pieces)
                    peak = float(np.max(np.abs(wav)))
                    rms = float(np.sqrt(np.mean(np.square(wav))))
                    duration = len(wav) / model.tts_model.sample_rate
                    problem = "signal outside bounds"
                    if 0.001 < rms and 0.005 < peak < 0.999 and 0.2 < duration < 45:
                        sf.write(wav_path, wav, model.tts_model.sample_rate)
                        command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav_path)]
                        tempo = voice_settings[(language, voice)]["normalTempo"]
                        if tempo != 1.0:
                            command += ["-filter:a", f"atempo={tempo}"]
                        command += ["-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(audio_path)]
                        subprocess.run(command, check=True)
                        segments, _ = recognizer.transcribe(str(audio_path), language=language, beam_size=5, condition_on_previous_text=False, temperature=0)
                        segments = list(segments)
                        transcript = " ".join(segment.text.strip() for segment in segments)
                        target, heard = quality.normalize(speech_text, language), quality.normalize(transcript, language)
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
                    "sampleRate": int(model.tts_model.sample_rate), "durationSeconds": duration / voice_settings[(language, voice)]["normalTempo"],
                    "peak": peak, "rms": rms, "sha256": hashlib.sha256(audio_path.read_bytes()).hexdigest(),
                    "file": audio_path.name, "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "approved": False,
                    "pipelineVersion": 6, "promptMode": args.prompt_mode,
                    "inferenceTimesteps": voice_settings[(language, voice)]["inferenceTimesteps"],
                    "normalTempo": voice_settings[(language, voice)]["normalTempo"],
                    "generationSignature": generation_signature,
                    "referenceSha256": voice_settings[(language, voice)]["referenceSha256"],
                    "referenceCache": True,
                    "qualityCheck": {"transcript": transcript, "wordErrorRate": wer, "characterErrorRate": cer, "tokensPerSecond": pace},
                }
                log.write(json.dumps(row, ensure_ascii=False) + "\n")
                log.flush()
                print(f"{index}/{len(work)} {clip_id}: {text[:60]}", flush=True)
            except Exception as exc:
                error_log.write(json.dumps({"id": clip_id, "language": language, "voice": voice,
                                            "text": text, "generationSignature": generation_signature,
                                            "error": str(exc)}, ensure_ascii=False) + "\n")
                error_log.flush()
                print(f"FAILED {clip_id}: {exc}", flush=True)
            finally:
                wav_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
