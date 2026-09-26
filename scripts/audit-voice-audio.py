"""Resumable local text/pace triage. This never grants pronunciation review."""
import argparse
import hashlib
import importlib.util
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def normalize(text):
    return " ".join(re.findall(r"[^\W_]+", unicodedata.normalize("NFC", text).casefold()))

def distance(left, right):
    row = list(range(len(right) + 1))
    for index, item in enumerate(left, 1):
        next_row = [index]
        for other_index, other in enumerate(right, 1):
            next_row.append(min(next_row[-1] + 1, row[other_index] + 1, row[other_index - 1] + (item != other)))
        row = next_row
    return row[-1]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--metadata", type=Path)
    parser.add_argument("--model", default="small")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--output", type=Path, default=ROOT / "audio/generated/quality-audit.jsonl")
    args = parser.parse_args()
    from faster_whisper import WhisperModel
    spec = importlib.util.spec_from_file_location("voice_generator", ROOT / "scripts/generate-approved-voice-coverage.py")
    generator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator)
    spoken_form = generator.spoken_form

    if args.metadata:
        rows = [json.loads(line) for line in args.metadata.read_text().splitlines()]
        for row in rows:
            row["path"] = args.metadata.parent / row["file"]
    else:
        rows = json.loads((ROOT / "public/audio/packs/approved.json").read_text())["clips"]
        rows = [dict(row, sourceText=row["text"], path=ROOT / "public" / row["url"].lstrip("/")) for row in rows if row["language"] in ("es", "vi")]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    previous = [json.loads(line) for line in args.output.read_text().splitlines()] if args.output.exists() else []
    done = {(row["sha256"], row["model"], row["auditVersion"]) for row in previous}
    rows = [row for row in rows if (row["sha256"], args.model, 1) not in done]
    if args.limit:
        rows = rows[:args.limit]
    if not rows:
        print("No unaudited clips")
        return
    model = WhisperModel(args.model, device="cpu", compute_type="int8", download_root=str(ROOT / "audio/models"))
    with args.output.open("a", encoding="utf-8") as output:
        for index, row in enumerate(rows, 1):
            assert hashlib.sha256(row["path"].read_bytes()).hexdigest() == row["sha256"]
            expected = row.get("spokenText") or spoken_form(row["language"], row["sourceText"])
            segments, info = model.transcribe(str(row["path"]), language=row["language"], beam_size=5, condition_on_previous_text=False, temperature=0)
            segments = list(segments)
            actual = " ".join(segment.text.strip() for segment in segments)
            target, heard = normalize(expected), normalize(actual)
            words = target.split()
            wer = distance(words, heard.split()) / max(1, len(words))
            cer = distance(target, heard) / max(1, len(target))
            speech_seconds = sum(segment.end - segment.start for segment in segments)
            pace = len(words) / max(speech_seconds, .1)
            flags = []
            if not actual or target != heard:
                flags.append("text-mismatch")
            if len(words) >= 4 and pace > (3.4 if row["language"] == "es" else 5.0):
                flags.append("fast-speech")
            report = {"id": row["id"], "sha256": row["sha256"], "model": args.model, "auditVersion": 1,
                      "language": row["language"], "expected": expected, "transcript": actual,
                      "wordErrorRate": wer, "characterErrorRate": cer, "tokensPerSecond": pace,
                      "flags": flags, "status": "needs-review" if flags else "automated-pass"}
            output.write(json.dumps(report, ensure_ascii=False) + "\n")
            output.flush()
            print(f"{index}/{len(rows)} {row['id']}: {report['status']} {','.join(flags)}", flush=True)

if __name__ == "__main__":
    main()
