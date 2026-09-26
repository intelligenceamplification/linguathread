"""Reuse words from text-matched recordings instead of resynthesizing tiny prompts.

Cuts remain provisional and must pass the same standalone AAC audit before publish.
"""
import argparse
import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "audio/generated/fragments")
    args = parser.parse_args()
    from faster_whisper import WhisperModel
    import imageio_ffmpeg
    spec = importlib.util.spec_from_file_location("quality", ROOT / "scripts/audit-voice-audio.py")
    quality = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(quality)
    clips = json.loads((ROOT / "public/audio/packs/approved.json").read_text())["clips"]
    audit = {row["sha256"]: row for line in (ROOT / "audio/generated/quality-audit.jsonl").read_text().splitlines() if (row := json.loads(line))}
    sources = [clip for clip in clips if clip["sha256"] in audit and audit[clip["sha256"]]["wordErrorRate"] == 0]
    bulk_dir = ROOT / "audio/generated/voice-coverage"
    if (bulk_dir / "audit.jsonl").exists():
        bulk_pass = {row["sha256"] for line in (bulk_dir / "audit.jsonl").read_text().splitlines() if (row := json.loads(line))["status"] == "automated-pass" and row["wordErrorRate"] == 0}
        for line in (bulk_dir / "metadata.jsonl").read_text().splitlines():
            row = json.loads(line)
            if row["sha256"] in bulk_pass:
                sources.append(dict(row, text=row["spokenText"], path=bulk_dir / row["file"]))
    targets = [clip for clip in clips if clip["sha256"] in audit and audit[clip["sha256"]]["flags"] and len(audit[clip["sha256"]]["expected"].split()) <= 3 and not clip.get("reviewedAt")]
    args.output.mkdir(parents=True, exist_ok=True)
    metadata = args.output / "metadata.jsonl"
    completed = {row["id"] for line in metadata.read_text().splitlines() if (row := json.loads(line))} if metadata.exists() else set()
    model = WhisperModel("small", device="cpu", compute_type="int8", download_root=str(ROOT / "audio/models"))
    cache = {}
    with metadata.open("a") as output:
        for target in targets:
            if target["id"] in completed:
                continue
            words = quality.normalize(audit[target["sha256"]]["expected"]).split()
            for source in sources:
                if source["language"] != target["language"] or source.get("voice") != target.get("voice"):
                    continue
                if " ".join(words) not in quality.normalize(source["text"]):
                    continue
                path = source.get("path") or ROOT / "public" / source["url"].lstrip("/")
                if source["sha256"] not in cache:
                    segments, _ = model.transcribe(str(path), language=source["language"], word_timestamps=True, condition_on_previous_text=False, temperature=0)
                    cache[source["sha256"]] = [word for segment in segments for word in segment.words]
                timing = cache[source["sha256"]]
                heard = [quality.normalize(word.word) for word in timing]
                index = next((i for i in range(len(heard) - len(words) + 1) if heard[i:i + len(words)] == words), None)
                if index is None:
                    continue
                end_index = index + len(words) - 1
                start = max(0, timing[index].start - .06, (timing[index - 1].end + timing[index].start) / 2 if index else 0)
                end = min(timing[end_index].end + .08, (timing[end_index].end + timing[end_index + 1].start) / 2 if end_index + 1 < len(timing) else timing[end_index].end + .08)
                destination = args.output / f"{target['id']}.m4a"
                subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-loglevel", "error", "-y", "-i", str(path), "-ss", str(start), "-t", str(end - start), "-c:a", "aac", "-b:a", "128k", str(destination)], check=True)
                row = {"id": target["id"], "language": target["language"], "voice": target["voice"], "sourceText": target["text"], "normalizedText": target["normalizedText"], "spokenText": audit[target["sha256"]]["expected"], "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(), "file": destination.name, "sourceClip": source["id"], "sourceSha256": source["sha256"], "startSeconds": start, "endSeconds": end, "approved": False}
                output.write(json.dumps(row, ensure_ascii=False) + "\n")
                output.flush()
                print(f"Extracted {target['text']} ({target['voice']}) from {source['text']}", flush=True)
                break

if __name__ == "__main__":
    main()
