"""Prepare or publish pitch-preserved Normal-speed derivatives of an existing voice.

The source pack is never modified during preparation. Publication verifies every
source and derivative hash, then switches the manifest atomically.
"""

import argparse
import hashlib
import json
import shutil
import subprocess
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def candidates(pack, language, voice):
    return [clip for clip in pack["clips"] if clip["language"] == language and clip.get("voice") == voice]


def prepare(pack, language, voice, tempo, output):
    import imageio_ffmpeg

    output.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    rows = []
    for index, clip in enumerate(candidates(pack, language, voice), 1):
        if clip.get("normalTempo", 1.0) != 1.0:
            raise ValueError(f"Refusing to retime an already adjusted clip: {clip['id']}")
        source = ROOT / "public" / clip["url"].lstrip("/")
        if digest(source) != clip["sha256"]:
            raise ValueError(f"Source hash mismatch: {source}")
        name = f"{clip['id']}-{clip['sha256'][:12]}-tempo{round(tempo * 100)}.m4a"
        target = output / name
        if not target.exists():
            subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
                            "-filter:a", f"atempo={tempo}", "-c:a", "aac", "-b:a", "128k",
                            "-movflags", "+faststart", str(target)], check=True)
        rows.append({"id": clip["id"], "language": language, "voice": voice,
                     "sourceText": clip["text"], "normalizedText": clip["normalizedText"],
                     "sourceSha256": clip["sha256"], "sourceUrl": clip["url"],
                     "sourceReviewedAt": clip.get("reviewedAt"), "normalTempo": tempo,
                     "sha256": digest(target), "file": name})
        if index % 25 == 0:
            print(f"Prepared {index} clips", flush=True)
    (output / "metadata.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Prepared {len(rows)} {language}/{voice} clips in {output}")


def apply(pack, language, voice, version, output, audit_path, skip_ids=()):
    metadata = json.loads((output / "metadata.json").read_text(encoding="utf-8"))
    skipped = set(skip_ids)
    if skipped - {row["id"] for row in metadata}:
        raise ValueError(f"Unknown skipped clip IDs: {sorted(skipped - {row['id'] for row in metadata})}")
    audits = {row["id"]: row for line in audit_path.read_text(encoding="utf-8").splitlines()
              if (row := json.loads(line))}
    if any((audit := audits.get(row["id"])) is None or
           audit.get("sourceSha256") != row["sourceSha256"] or
           audit.get("sha256") != row["sha256"] or
           audit.get("status") not in ("pass", "manual-pass", "transform-pass") or
           (audit.get("status") == "transform-pass" and row.get("sourceReviewedAt"))
           for row in metadata if row["id"] not in skipped):
        raise ValueError("Every retimed clip needs a matching passed comparison audit")
    source_clips = {clip["id"]: clip for clip in candidates(pack, language, voice)}
    if set(source_clips) != {row["id"] for row in metadata}:
        raise ValueError("Prepared clips do not cover the current voice pack exactly")
    destination = ROOT / "public/audio/packs" / version
    destination.mkdir(parents=True, exist_ok=True)
    updates = {}
    for row in metadata:
        if row["id"] in skipped:
            continue
        clip = source_clips[row["id"]]
        source = ROOT / "public" / clip["url"].lstrip("/")
        candidate = output / row["file"]
        if clip["sha256"] != row["sourceSha256"] or digest(source) != row["sourceSha256"] or digest(candidate) != row["sha256"]:
            raise ValueError(f"Changed source or derivative: {row['id']}")
        shutil.copy2(candidate, destination / row["file"])
        updates[row["id"]] = {**clip, "url": f"/audio/packs/{version}/{row['file']}",
                              "sha256": row["sha256"], "normalTempo": row["normalTempo"],
                              "tempoAdjustedFromSha256": row["sourceSha256"],
                              **({"needsAudioTextReview": True} if audits[row["id"]]["status"] == "transform-pass" else {})}
    pack["clips"] = [updates.get(clip["id"], clip) for clip in pack["clips"]]
    pack["packVersion"] = version
    pack["approvedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    manifest = ROOT / "public/audio/packs/approved.json"
    temporary = manifest.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(pack, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(manifest)
    print(f"Published {len(updates)} pitch-preserved clips as {version}; skipped {len(skipped)} clips needing repair")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--language", default="es")
    parser.add_argument("--voice", default="male")
    parser.add_argument("--tempo", type=float, default=0.85)
    parser.add_argument("--version", required=True)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--audit", type=Path, help="Original-versus-retimed transcript comparison JSONL")
    parser.add_argument("--skip-ids", type=Path, help="JSON array of clip IDs held for focused repair")
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if not 0.5 <= args.tempo <= 1.25:
        parser.error("tempo must be between 0.5 and 1.25")
    output = args.output or ROOT / "audio/generated" / f"retime-{args.version}-{args.language}-{args.voice}"
    pack = json.loads((ROOT / "public/audio/packs/approved.json").read_text(encoding="utf-8"))
    if args.apply:
        if not args.audit:
            parser.error("--apply requires --audit")
        skip_ids = json.loads(args.skip_ids.read_text(encoding="utf-8")) if args.skip_ids else []
        apply(pack, args.language, args.voice, args.version, output, args.audit, skip_ids)
    else:
        prepare(pack, args.language, args.voice, args.tempo, output)


if __name__ == "__main__":
    main()
