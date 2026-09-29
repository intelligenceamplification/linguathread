"""Publish generated voice-family clips without claiming utterance review."""

import argparse
import hashlib
import json
import re
import unicodedata
import shutil
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def review_key(language, text, voice):
    text = " ".join(re.findall(r"[^\W_]+", unicodedata.normalize("NFC", text).casefold()))
    return language, text, voice


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("metadata", type=Path)
    parser.add_argument("--version", default="v5")
    parser.add_argument("--audit", type=Path, required=True, help="Text and pace audit JSONL; only passing hashes may publish")
    parser.add_argument("--replace", action="store_true", help="Replace provisional takes with validated candidates")
    parser.add_argument("--listening-review", type=Path, help="Explicit human approval records bound to candidate hashes")
    args = parser.parse_args()
    manifest = ROOT / "public/audio/packs/approved.json"
    pack = json.loads(manifest.read_text(encoding="utf-8"))
    defects_file = ROOT / "audio/known-audio-defects.json"
    defects = json.loads(defects_file.read_text())["defects"] if defects_file.exists() else []
    blocked = {row["sha256"] for row in defects if row["status"] == "blocked"}
    required_reviews = {review_key(row["language"], row["text"], row.get("voice")) for row in defects if row.get("requiresPronunciationReview")}
    reviews = json.loads(args.listening_review.read_text())["reviews"] if args.listening_review else []
    approvals = {r["sha256"]: r for r in reviews if r.get("approved") is True and r.get("reviewedAt") and r.get("reviewedBy") and r.get("evidence")}
    pack["blockedAudioSha256"] = sorted(blocked)
    destination = ROOT / "public/audio/packs" / args.version
    destination.mkdir(parents=True, exist_ok=True)
    existing = {(clip["language"], clip["normalizedText"], clip.get("voice")) for clip in pack["clips"]}
    passing = {row["sha256"] for line in args.audit.read_text().splitlines()
               if (row := json.loads(line))["status"] == "automated-pass" and row["wordErrorRate"] == 0 and row["characterErrorRate"] == 0}
    added = 0
    for line in args.metadata.read_text(encoding="utf-8").splitlines():
        row = json.loads(line)
        if row["sha256"] in blocked:
            raise ValueError(f"Known defective audio cannot be republished: {row['id']}")
        review = approvals.get(row["sha256"])
        if review and review_key(review["language"], review["text"], review["voice"]) != review_key(row["language"], row["sourceText"], row["voice"]):
            raise ValueError("Listening approval does not match the exact candidate")
        if review_key(row["language"], row["sourceText"], row["voice"]) in required_reviews and not review:
            raise ValueError(f"Reported pronunciation requires listening review: {row['id']}")
        if row["sha256"] not in passing and not review:
            continue
        key = (row["language"], row["normalizedText"], row["voice"])
        previous = next((clip for clip in pack["clips"] if (clip["language"], clip["normalizedText"], clip.get("voice")) == key), None)
        if previous and (not args.replace or (previous.get("reviewedAt") and not review) or (previous["sha256"] == row["sha256"] and (not review or previous.get("reviewedAt")))):
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
            "normalTempo": row.get("normalTempo", 1.0),
            "generationSignature": row.get("generationSignature"),
            "qualityCheck": "human-listening-review" if review else "automated-text-and-pace",
            **({"reviewedAt": review["reviewedAt"], "reviewEvidence": review["evidence"]} if review else {}),
        })
        existing.add(key)
        added += 1
    pack["packVersion"] = args.version
    pack["approvedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    manifest.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Added {added} provisional clips; {len(pack['clips'])} clips in the manifest")


if __name__ == "__main__":
    main()
