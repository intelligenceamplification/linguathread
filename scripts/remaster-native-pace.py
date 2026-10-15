"""Remaster pace-only flagged Spanish takes, then require a fresh final-byte audit."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import wave


def remaster(metadata, ffmpeg):
    rows = [json.loads(line) for line in metadata.read_text().splitlines()]
    done = {r.get("paceAdjustedFromSha256") for r in rows}
    extra = []
    for row in rows:
        check = row.get("qualityCheck", {})
        if row["language"] != "es" or check.get("flags") != ["fast-speech"] or row["sha256"] in done:
            continue
        factor = max(.75, min(1.0, 2.8 / check["tokensPerSecond"]))
        cumulative = row.get("paceCorrectionFactor", 1) * factor
        if cumulative < .75:
            continue
        source = metadata.parent / row["file"]
        if hashlib.sha256(source.read_bytes()).hexdigest() != row["sha256"]:
            raise ValueError("Pace adjustment source changed")
        temporary = metadata.parent / (row["sha256"][:20] + "-pace.wav")
        subprocess.run([ffmpeg, "-v", "error", "-y", "-i", str(source), "-af", f"atempo={factor}", "-c:a", "pcm_s16le", str(temporary)], check=True)
        digest = hashlib.sha256(temporary.read_bytes()).hexdigest()
        destination = metadata.parent / ("es-" + row["voice"] + "-" + digest[:20] + ".wav")
        temporary.replace(destination)
        candidate = {k: v for k, v in row.items() if k not in ("qualityCheck", "reviewedAt", "reviewEvidence", "reviewed")}
        candidate.update(id=row["id"] + "-pace", file=destination.name, sha256=digest, paceAdjustedFromSha256=row["sha256"], paceCorrectionFactor=cumulative, reviewed=False)
        with wave.open(str(destination), "rb") as recording:
            candidate["durationSeconds"] = recording.getnframes() / recording.getframerate()
        extra.append(candidate)
    if extra:
        with metadata.open("a") as output:
            for row in extra:
                output.write(json.dumps(row, ensure_ascii=False) + "\n")
    return len(extra)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", type=Path, required=True)
    parser.add_argument("--ffmpeg", required=True)
    args = parser.parse_args()
    print(json.dumps({"remasteredCandidates": remaster(args.metadata, args.ffmpeg), "requiresFreshAudit": True}))
