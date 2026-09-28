"""Compare source and tempo-adjusted audio before switching the voice pack."""

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--model", default="small")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--source-audit", type=Path, default=ROOT / "audio/generated/quality-audit.jsonl",
                        help="Reuse prior transcripts keyed by source audio hash")
    args = parser.parse_args()
    from faster_whisper import WhisperModel

    spec = importlib.util.spec_from_file_location("quality", ROOT / "scripts/audit-voice-audio.py")
    quality = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(quality)
    rows = json.loads((args.folder / "metadata.json").read_text(encoding="utf-8"))
    output = args.folder / "comparison-audit.jsonl"
    completed = {json.loads(line)["id"] for line in output.read_text(encoding="utf-8").splitlines()} if output.exists() else set()
    work = [row for row in rows if row["id"] not in completed]
    if args.limit:
        work = work[:args.limit]
    if not work:
        print("No unaudited tempo derivatives")
        return
    recognizer = WhisperModel(args.model, device="cpu", compute_type="int8", download_root=str(ROOT / "audio/models"))
    known_sources = {}
    if args.source_audit.exists():
        for line in args.source_audit.read_text(encoding="utf-8").splitlines():
            report = json.loads(line)
            if report.get("model") == args.model and report.get("sha256") and report.get("transcript"):
                known_sources[report["sha256"]] = report["transcript"]

    def transcribe(path, language):
        segments, _ = recognizer.transcribe(str(path), language=language, beam_size=5,
                                            condition_on_previous_text=False, temperature=0)
        return " ".join(segment.text.strip() for segment in segments)

    with output.open("a", encoding="utf-8") as audit:
        for index, row in enumerate(work, 1):
            source = ROOT / "public" / row["sourceUrl"].lstrip("/")
            candidate = args.folder / row["file"]
            if hashlib.sha256(source.read_bytes()).hexdigest() != row["sourceSha256"]:
                raise ValueError(f"Source hash mismatch: {row['id']}")
            if hashlib.sha256(candidate.read_bytes()).hexdigest() != row["sha256"]:
                raise ValueError(f"Derivative hash mismatch: {row['id']}")
            original = known_sources.get(row["sourceSha256"]) or transcribe(source, row["language"])
            revised = transcribe(candidate, row["language"])
            expected = quality.normalize(row["sourceText"], row["language"])
            heard_original = quality.normalize(original, row["language"])
            heard_revised = quality.normalize(revised, row["language"])
            if heard_original == heard_revised or expected == heard_revised:
                status = "pass"
            elif len(expected.split()) <= 2 and not row.get("sourceReviewedAt"):
                # ASR is unstable on isolated sounds. Preserve the provisional
                # status and keep this item on the listening-review queue.
                status = "transform-pass"
            else:
                status = "review"
            report = {"id": row["id"], "sourceSha256": row["sourceSha256"], "sha256": row["sha256"],
                      "status": status, "expected": expected, "original": original, "revised": revised,
                      "originalMatch": expected == heard_original, "revisedMatch": expected == heard_revised}
            audit.write(json.dumps(report, ensure_ascii=False) + "\n")
            audit.flush()
            print(f"{index}/{len(work)} {status} {row['id']}", flush=True)


if __name__ == "__main__":
    main()
