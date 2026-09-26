"""Publish generated voice-family clips without claiming utterance review."""

import argparse
import hashlib
import json
import shutil
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("metadata", type=Path)
    parser.add_argument("--version", default="v5")
    parser.add_argument("--audit", type=Path, required=True, help="Text and pace audit JSONL; only passing hashes may publish")
    parser.add_argument("--replace", action="store_true", help="Replace provisional takes with validated candidates")
    args = parser.parse_args()
    manifest = ROOT / "public/audio/packs/approved.json"
    pack = json.loads(manifest.read_text(encoding="utf-8"))
    destination = ROOT / "public/audio/packs" / args.version
    destination.mkdir(parents=True, exist_ok=True)
    existing = {(clip["language"], clip["normalizedText"], clip.get("voice")) for clip in pack["clips"]}
    passing = {row["sha256"] for line in args.audit.read_text().splitlines()
               if (row := json.loads(line))["status"] == "automated-pass"}
    added = 0
    for line in args.metadata.read_text(encoding="utf-8").splitlines():
        row = json.loads(line)
        if row["sha256"] not in passing:
            continue
        key = (row["language"], row["normalizedText"], row["voice"])
        previous = next((clip for clip in pack["clips"] if (clip["language"], clip["normalizedText"], clip.get("voice")) == key), None)
        if previous and (not args.replace or previous.get("reviewedAt") or previous["sha256"] == row["sha256"]):
            continue
        source = args.metadata.parent / row["file"]
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if digest != row["sha256"]:
            raise ValueError(f"Hash mismatch: {source}")
        name = f"{row['id']}-{digest[:12]}{source.suffix}"
        shutil.copy2(source, destination / name)
        if previous:
            pack["clips"].remove(previous)
        pack["clips"].append({
            "id": row["id"], "language": row["language"], "text": row["sourceText"],
            "normalizedText": row["normalizedText"], "url": f"/audio/packs/{args.version}/{name}",
            "sha256": digest, "voice": row["voice"],
            "qualityCheck": "automated-text-and-pace",
        })
        existing.add(key)
        added += 1
    pack["packVersion"] = args.version
    pack["approvedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    manifest.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Added {added} provisional clips; {len(pack['clips'])} clips in the manifest")


if __name__ == "__main__":
    main()
