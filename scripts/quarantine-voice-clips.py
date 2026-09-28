"""Remove flagged provisional clips from selection while retaining their files for repair."""

import argparse
import hashlib
import json
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def quarantine(pack, ids):
    selected = set(ids)
    if len(selected) != len(ids):
        raise ValueError("Duplicate quarantine IDs")
    by_id = {clip["id"]: clip for clip in pack["clips"]}
    if selected - by_id.keys():
        raise ValueError(f"Unknown clip IDs: {sorted(selected - by_id.keys())}")
    for clip_id in selected:
        clip = by_id[clip_id]
        if clip.get("reviewedAt"):
            raise ValueError(f"Reviewed clip requires fresh human review before removal: {clip_id}")
        alternatives = [other for other in pack["clips"] if other["id"] not in selected
                        and other["language"] == clip["language"]
                        and other["normalizedText"] == clip["normalizedText"]]
        if not alternatives:
            raise ValueError(f"No exact-text alternate audio for: {clip_id}")
        for other in alternatives:
            path = ROOT / "public" / other["url"].lstrip("/")
            if hashlib.sha256(path.read_bytes()).hexdigest() != other["sha256"]:
                raise ValueError(f"Changed alternate audio: {other['id']}")
    pack["clips"] = [clip for clip in pack["clips"] if clip["id"] not in selected]
    return [by_id[clip_id] for clip_id in ids]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ids", type=Path, required=True, help="JSON array of exact clip IDs")
    parser.add_argument("--reason", required=True)
    parser.add_argument("--version", required=True)
    args = parser.parse_args()
    manifest = ROOT / "public/audio/packs/approved.json"
    pack = json.loads(manifest.read_text(encoding="utf-8"))
    ids = json.loads(args.ids.read_text(encoding="utf-8"))
    removed = quarantine(pack, ids)
    log = ROOT / "audio/generated" / f"quarantine-{args.version}.json"
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(json.dumps({"reason": args.reason, "removed": removed}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    pack["packVersion"] = args.version
    pack["approvedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    temporary = manifest.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(manifest)
    print(f"Quarantined {len(removed)} provisional clips; exact-text alternatives remain")


if __name__ == "__main__":
    main()
