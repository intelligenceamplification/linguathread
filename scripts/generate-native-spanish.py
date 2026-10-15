"""Resumable local Spanish synthesis with the accepted, pinned recipe.

This writes candidates only. Final-byte screening and release coverage are separate.
"""
import argparse
import hashlib
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import random
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "audio/generated/spanish-backend-benchmark"
os.environ.setdefault("HF_HOME", str(CACHE / "hf-cache"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def generation_key(recipe, text, voice, attempt, text_preparation_version=1, pronunciation=None):
    # Playback tempo and gain are rendering choices, not a reason to synthesize again.
    synthesis = {"backend": recipe["backend"], "models": {name: proof["sha256"] for name, proof in recipe["modelFiles"].items()}, "language": "es", "reference": voice["sourceReference"]["sha256"], "text": text, "voice": voice["voice"], "attempt": attempt, "exaggeration": recipe["exaggeration"], "cfgWeight": recipe["cfgWeight"], "temperature": recipe["temperature"], "textPreparationVersion": text_preparation_version}
    if pronunciation is not None:
        synthesis["pronunciationInput"] = pronunciation
    return hashlib.sha256(json.dumps(synthesis, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "audio/generated/ios-spanish-v1")
    parser.add_argument("--limit", type=int, default=30)
    parser.add_argument("--attempt", type=int, default=1)
    parser.add_argument("--ffmpeg", required=True)
    parser.add_argument("--terminal-punctuation", action="store_true", help="Bounded pronunciation repair using a complete citation utterance")
    parser.add_argument("--pronunciation-map", type=Path, help="Isolated canonical-text to speech-input repair map")
    args = parser.parse_args()
    pronunciation_map = json.loads(args.pronunciation_map.read_text()) if args.pronunciation_map else {}
    if not isinstance(pronunciation_map, dict) or any(not isinstance(k, str) or not isinstance(v, str) or not v.strip() for k, v in pronunciation_map.items()):
        parser.error("Pronunciation map must contain nonempty text pairs")
    if args.attempt not in (1, 2, 3) or args.limit < 1:
        parser.error("Use a positive batch size and at most three attempts")
    recipe_path = ROOT / "audio/spanish-recipe-v1.json"
    recipe = json.loads(recipe_path.read_text())
    signature = sha(recipe_path)
    for name, proof in recipe["modelFiles"].items():
        if sha(CACHE / "checkpoints" / name) != proof["sha256"]:
            raise ValueError(f"Model checkpoint changed: {name}")
    args.output.mkdir(parents=True, exist_ok=True)
    source_cache = args.output / "source-recordings"
    source_cache.mkdir(exist_ok=True)
    metadata = args.output / "metadata.jsonl"
    previous = [json.loads(line) for line in metadata.read_text().splitlines()] if metadata.exists() else []
    preparation = 2 if args.terminal_punctuation else 1
    done = {(r["sourceText"], r["voice"], r["recipeSha256"], r["attempt"], r.get("textPreparationVersion", 1), r.get("pronunciationInput")) for r in previous if (args.output / r["file"]).is_file() and sha(args.output / r["file"]) == r["sha256"]}
    queue = []
    for item in json.loads(args.inventory.read_text())["items"]:
        if item["language"] != "es":
            continue
        for voice in recipe["voices"]:
            if voice["voice"] not in item.get("neededVariants", ["male", "female"]):
                continue
            item_preparation = 3 if item["text"] in pronunciation_map else preparation
            if (item["text"], voice["voice"], signature, args.attempt, item_preparation, pronunciation_map.get(item["text"])) not in done:
                queue.append((item, voice))
    queue = queue[:args.limit]
    if not queue:
        print("No pending Spanish takes", flush=True)
        return
    model_lock = (ROOT / "audio/generated/.spanish-model.lock").open("a")
    print("Waiting for the exclusive Spanish model memory slot", flush=True)
    fcntl.flock(model_lock, fcntl.LOCK_EX)
    print("Acquired the Spanish model memory slot", flush=True)
    import numpy as np
    import soundfile as sf
    import torch
    spec = importlib.util.spec_from_file_location("benchmark", ROOT / "scripts/benchmark-spanish-backend.py")
    backend = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(backend)
    spec = importlib.util.spec_from_file_location("voice_text", ROOT / "scripts/generate-approved-voice-coverage.py")
    text_tools = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(text_tools)
    model = backend.load_spanish_model(CACHE / "checkpoints", args.output)
    # Prepare each reference once per batch, rather than re-encoding it for every phrase.
    conditionals = {}
    for voice in recipe["voices"]:
        reference = ROOT / "public" / voice["sourceReference"]["url"].lstrip("/")
        if sha(reference) != voice["sourceReference"]["sha256"]:
            raise ValueError("Approved reference changed")
        wav = args.output / ("reference-" + voice["voice"] + ".wav")
        subprocess.run([args.ffmpeg, "-v", "error", "-y", "-i", str(reference), "-ac", "1", str(wav)], check=True)
        model.prepare_conditionals(str(wav), exaggeration=recipe["exaggeration"])
        conditionals[voice["voice"]] = model.conds
    with metadata.open("a") as output:
        for index, (item, voice) in enumerate(queue, 1):
            item_preparation = 3 if item["text"] in pronunciation_map else preparation
            pronunciation = pronunciation_map.get(item["text"])
            key = generation_key(recipe, item["text"], voice, args.attempt, item_preparation, pronunciation)
            seed = int(key[:8], 16)
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)
            model.conds = conditionals[voice["voice"]]
            spoken = text_tools.spoken_form("es", item["text"])
            synthesis_text = pronunciation if pronunciation is not None else spoken + "." if args.terminal_punctuation and not spoken.endswith((".", "?", "!", "…")) else spoken
            print(f"{index}/{len(queue)} {voice['voice']}: {item['text']}", flush=True)
            try:
                cached = source_cache / (key + ".flac")
                proof_path = cached.with_suffix(".json")
                if cached.exists() and proof_path.exists():
                    proof = json.loads(proof_path.read_text())
                    if proof["generationSignature"] != key or sha(cached) != proof["sha256"]:
                        raise ValueError("Cached source recording changed")
                    samples, sample_rate = sf.read(cached)
                    gain = proof["outputGain"]
                else:
                    audio = model.generate(synthesis_text, language_id="es", exaggeration=recipe["exaggeration"], cfg_weight=recipe["cfgWeight"], temperature=recipe["temperature"])
                    samples = audio.squeeze().cpu().numpy()
                    if not np.isfinite(samples).all() or not len(samples):
                        raise ValueError("Invalid generated signal")
                    peak = float(np.max(np.abs(samples)))
                    if peak < 0.005:
                        raise ValueError("Silent generated signal")
                    gain = min(1.0, recipe["outputPeakCeiling"] / peak)
                    sf.write(cached, samples * gain, model.sr, subtype="PCM_16")
                    proof_path.write_text(json.dumps({"generationSignature": key, "sha256": sha(cached), "outputGain": gain, "sourceText": item["text"], "voice": voice["voice"]}, ensure_ascii=False, indent=2) + "\n")
                    samples, sample_rate = sf.read(cached)
                raw = args.output / (key[:20] + "-raw.wav")
                processed = args.output / (key[:20] + "-teacher.wav")
                sf.write(raw, samples, sample_rate, subtype="PCM_16")
                subprocess.run([args.ffmpeg, "-v", "error", "-y", "-i", str(raw), "-af", f"volume={recipe['postGain']},atempo={voice['normalTempo']}", "-c:a", "pcm_s16le", str(processed)], check=True)
                duration = sf.info(processed).duration
                delivery = args.output / (key[:20] + "-delivery.m4a")
                subprocess.run([args.ffmpeg, "-v", "error", "-y", "-i", str(processed), "-c:a", "aac", "-b:a", "128k", "-ac", "1", "-movflags", "+faststart", str(delivery)], check=True)
                digest = sha(delivery)
                destination = args.output / ("es-" + voice["voice"] + "-" + digest[:20] + ".m4a")
                delivery.replace(destination)
                processed.unlink()
                row = {"id": "es-" + key[:20], "language": "es", "voice": voice["voice"], "sourceText": item["text"], "spokenText": spoken, "synthesisText": synthesis_text, "textPreparationVersion": item_preparation, "pronunciationInput": pronunciation, "file": destination.name, "sha256": digest, "sourceRecording": str(cached.relative_to(args.output)), "sourceRecordingSha256": sha(cached), "referenceSha256": voice["sourceReference"]["sha256"], "backend": recipe["backend"], "recipeSha256": signature, "generationSignature": key, "normalTempo": voice["normalTempo"], "seed": seed, "attempt": args.attempt, "outputGain": gain, "outputCodec": "aac-128k-mono", "durationSeconds": duration, "generatedAt": time.time(), "reviewed": False}
                if item.get("extractionTarget"):
                    row.update(candidateRole="context-parent", extractionTarget=item["extractionTarget"], extractionWordOffset=item["extractionWordOffset"])
                output.write(json.dumps(row, ensure_ascii=False) + "\n")
                output.flush()
                raw.unlink()
            except Exception as error:
                with (args.output / "failed.jsonl").open("a") as failures:
                    failures.write(json.dumps({"text": item["text"], "voice": voice["voice"], "attempt": args.attempt, "error": str(error)}, ensure_ascii=False) + "\n")
                print(f"Held: {error}", flush=True)


if __name__ == "__main__":
    main()
