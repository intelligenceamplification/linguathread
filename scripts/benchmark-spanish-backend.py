"""Isolated pronunciation experiment. Never publishes or marks audio reviewed."""
import argparse
import hashlib
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "audio/generated/spanish-backend-benchmark"
os.environ.setdefault("HF_HOME", str(OUT / "hf-cache"))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_spanish_model(checkpoints, output):
    import torch
    from safetensors.torch import load_file
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    from chatterbox.models.t3 import T3
    from chatterbox.models.t3.modules.t3_config import T3Config
    from chatterbox.models.s3gen import S3Gen
    from chatterbox.models.voice_encoder import VoiceEncoder
    from chatterbox.models.tokenizers import MTLTokenizer
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    ve = VoiceEncoder()
    ve.load_state_dict(torch.load(checkpoints / "ve.pt", map_location="cpu", weights_only=True))
    t3 = T3(T3Config.multilingual())
    t3.load_state_dict(load_file(checkpoints / "t3_es_es.safetensors"))
    decoder = S3Gen()
    result = decoder.load_state_dict(torch.load(checkpoints / "s3gen_v3.pt", map_location="cpu", weights_only=True), strict=False)
    (output / "decoder-load.json").write_text(json.dumps({"missing": result.missing_keys, "unexpected": result.unexpected_keys}, indent=2) + "\n")
    allowed_buffers = {"tokenizer._mel_filters", "tokenizer.window"}
    if set(result.missing_keys) - allowed_buffers or set(result.missing_keys) - set(dict(decoder.named_buffers())):
        raise RuntimeError(f"Missing decoder weights: {result.missing_keys}")
    return ChatterboxMultilingualTTS(t3.to(device).eval(), decoder.to(device).eval(), ve.to(device).eval(), MTLTokenizer(str(checkpoints / "grapheme_mtl_merged_expanded_v1.json")), device)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--download-only", action="store_true")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    args = parser.parse_args()
    from huggingface_hub import HfApi, hf_hub_download
    OUT.mkdir(parents=True, exist_ok=True)
    checkpoints = OUT / "checkpoints"
    checkpoints.mkdir(exist_ok=True)
    api = HfApi()
    specs = {
        "ResembleAI/chatterbox": ["ve.pt", "grapheme_mtl_merged_expanded_v1.json"],
        "ResembleAI/Chatterbox-Multilingual-es-es": ["t3_es_es.safetensors", "s3gen_v3.pt"],
    }
    provenance = {}
    for repo, files in specs.items():
        revision = api.model_info(repo).sha
        for name in files:
            path = Path(hf_hub_download(repo, name, revision=revision))
            link = checkpoints / name
            if not link.exists():
                link.symlink_to(path)
            provenance[name] = {"repository": repo, "revision": revision, "sha256": digest(path)}
            print(f"Ready: {name}", flush=True)
    (OUT / "model-provenance.json").write_text(json.dumps(provenance, indent=2) + "\n")
    if args.download_only:
        return
    import random
    import subprocess
    import numpy as np
    import soundfile as sf
    import torch
    model = load_spanish_model(checkpoints, OUT)
    refs = {
        "male": ROOT / "public/audio/packs/v5/es-male-742018e80e2e975e-dcd0fbac7bcd.m4a",
        "female": ROOT / "public/audio/packs/v5/es-female-6a81111823816aa9-3f93ec4315fc.m4a",
    }
    expected_references = {
        "male": "dcd0fbac7bcdf066ddf55e8879189b8b546a2c2f205febcfae1772cf3a927875",
        "female": "3f93ec4315fc6cbc97ce2aa45435e61f2e6659c42ced2024daf573fc9448dbb8",
    }
    for voice, reference in refs.items():
        if digest(reference) != expected_references[voice]:
            raise RuntimeError(f"Approved {voice} reference changed")
        wav_reference = OUT / f"approved-{voice}-reference.wav"
        subprocess.run([args.ffmpeg, "-v", "error", "-y", "-i", str(reference), "-ac", "1", str(wav_reference)], check=True)
        for index, text in enumerate(["De.", "Eres.", "Soy de Indiana."]):
            destination = OUT / f"es-{voice}-{index}.wav"
            if destination.exists():
                continue
            seed = 42 + index
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)
            print(f"Generating {voice}: {text}", flush=True)
            audio = model.generate(text, language_id="es", audio_prompt_path=str(wav_reference), exaggeration=0.3, cfg_weight=0.3, temperature=0.6)
            samples = audio.squeeze().cpu().numpy()
            if not np.isfinite(samples).all():
                raise RuntimeError("Non-finite generated audio")
            peak = float(np.max(np.abs(samples)))
            gain = min(1.0, 0.95 / max(peak, 1e-9))
            sf.write(destination, samples * gain, model.sr, subtype="PCM_16")
            receipt = {"id": destination.stem, "file": destination.name, "sourceText": text, "text": text, "language": "es", "voiceCandidate": voice, "backend": "Chatterbox-Multilingual-es-es", "referenceSha256": digest(reference), "sha256": digest(destination), "seed": seed, "exaggeration": 0.3, "cfgWeight": 0.3, "temperature": 0.6, "outputGain": gain, "reviewed": False, "publicationPerformed": False}
            destination.with_suffix(".json").write_text(json.dumps(receipt, indent=2) + "\n")
            print(f"Saved {destination.name}", flush=True)
    prepare_teacher_samples(args.ffmpeg)


def prepare_teacher_samples(ffmpeg):
    import subprocess
    receipts = []
    for path in sorted(OUT.glob("es-*.json")):
        source = json.loads(path.read_text())
        tempo = 0.85 if source["voiceCandidate"] == "male" else 0.70
        destination = OUT / ("teacher-" + source["file"])
        subprocess.run([ffmpeg, "-v", "error", "-y", "-i", str(OUT / source["file"]), "-af", f"volume=0.95,atempo={tempo}", "-c:a", "pcm_s16le", str(destination)], check=True)
        authored = "de" if source["id"].endswith("-0") else "eres" if source["id"].endswith("-1") else source["sourceText"]
        receipt = dict(source, id=destination.stem, file=destination.name, sourceText=authored, spokenText=source["text"], voice=source["voiceCandidate"], sourceSha256=source["sha256"], sha256=digest(destination), normalTempo=tempo)
        destination.with_suffix(".json").write_text(json.dumps(receipt, indent=2) + "\n")
        receipts.append(receipt)
    (OUT / "metadata.jsonl").write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in receipts))


if __name__ == "__main__":
    main()
