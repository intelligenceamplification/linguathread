#!/usr/bin/env python3
"""Generate reproducible, metadata-rich VoxCPM2 curriculum candidates."""
from __future__ import annotations

import argparse
import hashlib
import json
import time
import unicodedata
from pathlib import Path


def normalized(text: str) -> str:
    return " ".join(unicodedata.normalize("NFC", text).strip().split())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--only", help="Optional comma-separated item IDs")
    args = parser.parse_args()
    manifest_path = Path(args.manifest)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    selected = set(args.only.split(",")) if args.only else None

    from voxcpm import VoxCPM
    import soundfile as sf
    import numpy as np
    import torch

    model_name = manifest["model"]
    settings = manifest["settings"]
    model = VoxCPM.from_pretrained(model_name, load_denoiser=False)
    metadata_path = output / "metadata.jsonl"
    completed = set()
    if metadata_path.exists():
        for line in metadata_path.read_text(encoding="utf-8").splitlines():
            try:
                completed.add(json.loads(line)["id"])
            except (json.JSONDecodeError, KeyError):
                pass
    with metadata_path.open("a", encoding="utf-8") as metadata:
        for index, item in enumerate(manifest["items"]):
            if item["id"] in completed or (selected and item["id"] not in selected):
                continue
            seed = int(settings["seed"]) + index
            source = item["text"]
            voice = manifest["voiceDescription"]
            designed_text = f"({voice}){source}"
            # VoxCPM2 2.0.3 exposes seed through process RNG state rather than
            # the Python generate signature; retain the seed in metadata.
            torch.manual_seed(seed)
            np.random.seed(seed)
            wav = model.generate(
                text=designed_text,
                cfg_value=float(settings["cfgValue"]),
                inference_timesteps=int(settings["inferenceTimesteps"]),
            )
            path = output / f"{item['id']}.wav"
            sf.write(path, wav, model.tts_model.sample_rate)
            payload = path.read_bytes()
            record = {
                **item,
                "sourceText": source,
                "normalizedText": normalized(source),
                "model": model_name,
                "voiceDescription": voice,
                "settings": {**settings, "seed": seed},
                "sampleRate": int(model.tts_model.sample_rate),
                "durationSeconds": len(wav) / float(model.tts_model.sample_rate),
                "sha256": hashlib.sha256(payload).hexdigest(),
                "file": path.name,
                "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "approved": True,
            }
            metadata.write(json.dumps(record, ensure_ascii=False) + "\n")
            metadata.flush()


if __name__ == "__main__":
    main()
