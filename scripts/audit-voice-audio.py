"""Resumable local text/pace triage. This never grants pronunciation review."""
import argparse
import hashlib
import importlib.util
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT_VERSION = 2

def active_speech_span(audio, sample_rate=16000):
    """Include natural internal pauses, excluding padded ends of the utterance."""
    import numpy as np
    if not len(audio):
        return 0.0
    width = max(1, round(sample_rate * .02))
    padded = np.pad(audio, (0, (-len(audio)) % width))
    rms = np.sqrt(np.mean(np.square(padded.reshape(-1, width)), axis=1))
    active = np.flatnonzero(rms > max(.003, float(rms.max()) * .06))
    return min(len(audio) / sample_rate, (active[-1] - active[0] + 1) * .02 + .16) if len(active) else 0.0

def intelligibility_flags(segments):
    flags = []
    if not segments or any(segment.avg_logprob < -1.0 or segment.no_speech_prob > .6 for segment in segments):
        flags.append("uncertain-speech")
    if any(segment.compression_ratio > 2.4 for segment in segments):
        flags.append("repetition-risk")
    return flags

SPOKEN_NUMBERS = {
    "es": {**dict(enumerate(("cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"))), 20: "veinte"},
    "vi": {**dict(enumerate(("không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"))), 20: "hai mươi"},
}

def normalize(text, language=None):
    words = re.findall(r"[^\W_]+", unicodedata.normalize("NFC", text).casefold())
    numbers = SPOKEN_NUMBERS.get(language, {})
    return " ".join(numbers.get(int(word), word) if word.isascii() and word.isdigit() else word for word in words)

def text_matches(expected, transcript, language):
    target, heard = normalize(expected, language), normalize(transcript, language)
    if target == heard:
        return True
    # Isolated sí/si has the same spoken segment sequence. ASR spelling cannot
    # establish its written accent or intended meaning; writing assessment and
    # lesson comprehension still keep those distinctions strictly separate.
    if language == "es" and {target, heard} == {"sí", "si"}:
        return True
    # ASR can render a spoken letter name as its written symbol. Restrict this
    # equivalence to an explicit teaching cue, never ordinary words or writing
    # assessment. Names follow https://www.rae.es/espanol-al-dia/un-solo-nombre-para-cada-letra
    prefix = "esta es la letra "
    names = {"be": "b", "ce": "c", "de": "d", "efe": "f", "ge": "g", "hache": "h", "jota": "j", "ka": "k", "ele": "l", "eme": "m", "ene": "n", "eñe": "ñ", "pe": "p", "cu": "q", "erre": "r", "ese": "s", "te": "t", "uve": "v", "uve doble": "w", "equis": "x", "ye": "y", "zeta": "z"}
    if language != "es" or not target.startswith(prefix):
        return False
    name = target[len(prefix):]
    if heard == prefix + names.get(name, ""):
        return True
    # Joined ASR words do not alter the sound of an explicit marked-letter
    # name. Keep every character/diacritic; never equate i/y or n/ñ.
    marked = {f"{vowel} con tilde" for vowel in "aeiou"} | {"u con diéresis"}
    return name in marked and heard.startswith(prefix) and name.replace(" ", "") == heard[len(prefix):].replace(" ", "")

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
    parser.add_argument("--word-timestamps", action="store_true", help="Save alignment for checked contextual-word extraction")
    parser.add_argument("--output", type=Path, default=ROOT / "audio/generated/quality-audit.jsonl")
    args = parser.parse_args()
    from faster_whisper import WhisperModel
    from faster_whisper.audio import decode_audio
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
    updates = []
    latest_checks = {(check["sha256"], check["model"], check["auditVersion"]): check for check in previous}
    for check in latest_checks.values():
        if "text-mismatch" in check.get("flags", []) and text_matches(check.get("expected", ""), check.get("transcript", ""), check.get("language")):
            flags = [flag for flag in check["flags"] if flag != "text-mismatch"]
            updates.append(dict(check, flags=flags, status="needs-review" if flags else "automated-pass", textEquivalence="explicit-audio-notation"))
    if updates:
        with args.output.open("a") as output:
            output.write("".join(json.dumps(check, ensure_ascii=False) + "\n" for check in updates))
        previous.extend(updates)
    done = {(row["sha256"], row["model"], row["auditVersion"]) for row in previous}
    rows = [row for row in rows if (row["sha256"], args.model, AUDIT_VERSION) not in done]
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
            segments, info = model.transcribe(str(row["path"]), language=row["language"], beam_size=5, condition_on_previous_text=False, temperature=0, word_timestamps=args.word_timestamps)
            segments = list(segments)
            actual = " ".join(segment.text.strip() for segment in segments)
            target, heard = normalize(expected, row["language"]), normalize(actual, row["language"])
            words = target.split()
            wer = distance(words, heard.split()) / max(1, len(words))
            cer = distance(target, heard) / max(1, len(target))
            speech_seconds = active_speech_span(decode_audio(str(row["path"]), sampling_rate=16000))
            pace = len(words) / max(speech_seconds, .1)
            flags = intelligibility_flags(segments)
            if not actual or not text_matches(expected, actual, row["language"]):
                flags.append("text-mismatch")
            if len(words) >= 4 and pace > (3.4 if row["language"] == "es" else 5.0):
                flags.append("fast-speech")
            report = {"id": row["id"], "sha256": row["sha256"], "model": args.model, "auditVersion": AUDIT_VERSION,
                      "language": row["language"], "expected": expected, "transcript": actual,
                      "wordErrorRate": wer, "characterErrorRate": cer, "tokensPerSecond": pace,
                      "minimumSpeechConfidence": min((segment.avg_logprob for segment in segments), default=None),
                      "paceMethod": "energy-active-span-v1", "speechSeconds": speech_seconds,
                      "flags": flags, "status": "needs-review" if flags else "automated-pass"}
            if args.word_timestamps:
                report["words"] = [{"text": word.word, "start": word.start, "end": word.end, "probability": word.probability} for segment in segments for word in (segment.words or [])]
            output.write(json.dumps(report, ensure_ascii=False) + "\n")
            output.flush()
            print(f"{index}/{len(rows)} {row['id']}: {report['status']} {','.join(flags)}", flush=True)

if __name__ == "__main__":
    main()
