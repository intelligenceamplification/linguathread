"""Generate approved-voice Dora candidates in the local Kokoro environment."""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from kokoro import KModel, KPipeline

from audio_pipeline import ROOT, digest, inspect_wav, read, spoken


def generate():
    job = json.load(sys.stdin)
    recipe_path = ROOT / "audio/spanish-dora-recipe.json"
    recipe = read(recipe_path)
    signature = digest(recipe_path.read_bytes())
    assets = ROOT / "audio/generated/auditions-20261103/kokoro-assets"
    weights = assets / "kokoro-v1_0.pth"
    voice = ROOT / "audio/generated/spanish-female-audition-20261109/ef_dora.pt"
    for path, expected in ((weights, recipe["modelSha256"]), (voice, recipe["voiceSha256"])):
        if digest(path.read_bytes()) != expected:
            raise ValueError(f"Dora model asset changed: {path.name}")
    reference = recipe["references"][0]
    if digest((ROOT / reference["file"]).read_bytes()) != reference["sha256"]:
        raise ValueError("Dora listening reference changed")

    torch.set_num_threads(4)
    model = KModel(repo_id=recipe["model"], config=str(assets / "config.json"), model=str(weights)).eval()
    pipeline = KPipeline(lang_code=recipe["languageCode"], model=model, repo_id=recipe["model"])
    directory = Path(job["output"])
    with (directory / "metadata.jsonl").open("a") as metadata:
        for item in job["items"]:
            text = item["text"]
            spoken_text = spoken(text)
            synthesis = item.get("pronunciation") or spoken_text
            if item["preparation"] == 2 and not synthesis.endswith((".", "?", "!", "…")):
                synthesis += "."
            key = digest(json.dumps([signature, text, synthesis, item["preparation"], item.get("pronunciation"), job["attempt"]], ensure_ascii=False).encode())
            torch.manual_seed(int(key[:8], 16))
            segments = list(pipeline(synthesis, voice=str(voice), speed=recipe["speed"]))
            samples = np.concatenate([segment.audio.detach().cpu().numpy() for segment in segments])
            if not len(samples) or not np.isfinite(samples).all():
                raise ValueError("Invalid Dora signal")
            raw = directory / f"{key[:20]}-dora-raw.wav"
            delivery = directory / f"{key[:20]}-dora-master.wav"
            sf.write(raw, samples, 24000, subtype="PCM_16")
            measurement = subprocess.run(
                [job["ffmpeg"], "-hide_banner", "-i", str(raw), "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                capture_output=True, text=True, check=True,
            )
            stats = json.loads(re.findall(r"\{[^{}]*\}", measurement.stderr)[-1])
            gain = min(recipe["targetLUFS"] - float(stats["input_i"]), recipe["truePeakCeilingDb"] - float(stats["input_tp"]))
            subprocess.run(
                [job["ffmpeg"], "-v", "error", "-y", "-i", str(raw), "-af", f"volume={gain:.4f}dB", "-c:a", "pcm_s16le", str(delivery)],
                check=True,
            )
            data = delivery.read_bytes()
            check = inspect_wav(data)
            if check["status"] != "technical-pass":
                raise ValueError(f"Dora output failed technical checks: {text}")
            sha = digest(data)
            destination = directory / f"es-female-{sha[:20]}.wav"
            delivery.replace(destination)
            raw.unlink()
            row = dict(
                id="es-" + key[:20], language="es", voice="female", sourceText=text,
                spokenText=spoken_text, synthesisText=synthesis, file=destination.name, sha256=sha,
                referenceSha256=reference["sha256"], backend=recipe["backend"], recipeSha256=signature,
                generationSignature=key, attempt=job["attempt"], textPreparationVersion=item["preparation"],
                pronunciationInput=item.get("pronunciation"), normalTempo=recipe["speed"], outputGainDb=gain,
                durationSeconds=len(samples) / 24000, reviewed=False,
            )
            if item.get("extractionTarget"):
                row.update(candidateRole="context-parent", extractionTarget=item["extractionTarget"], extractionWordOffset=item["extractionWordOffset"])
            metadata.write(json.dumps(row, ensure_ascii=False) + "\n")
            metadata.flush()
            print(f"Dora: {text}", flush=True)


if __name__ == "__main__":
    generate()
