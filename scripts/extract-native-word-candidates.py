"""Extract reported short words from screened same-voice parent utterances.

No new speaker, no tempo transformation, and no automatic listening approval.
"""
import argparse
import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def crop_checked_audio(ffmpeg, source, destination, start, end):
    if end-start < .08:
        raise ValueError("Word interval is too short to extract safely")
    filters = f"atrim=start={start}:end={end},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.005,afade=t=out:st={end-start-.005}:d=0.005,adelay=120,apad=pad_dur=0.12"
    subprocess.run([ffmpeg, "-loglevel", "error", "-y", "-i", str(source), "-af", filters, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", str(destination)], check=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work-directory", type=Path, default=ROOT / "audio/generated/ios-approved-v1")
    parser.add_argument("--output", type=Path, default=ROOT / "audio/generated/ios-fragment-takes")
    parser.add_argument("--target", help="One exact missing utterance for a bounded extraction experiment")
    parser.add_argument("--limit", type=int, default=4)
    args = parser.parse_args()
    if args.limit < 1:
        parser.error("Use a positive candidate limit")
    from faster_whisper import WhisperModel
    import imageio_ffmpeg
    spec = importlib.util.spec_from_file_location("native_quality", ROOT / "scripts/audit-voice-audio.py")
    quality = importlib.util.module_from_spec(spec); spec.loader.exec_module(quality)
    staging = args.work_directory
    pack = json.loads((staging / "manifest.json").read_text())
    rows = {row["sha256"]: row for line in (staging / "metadata.jsonl").read_text().splitlines() if (row := json.loads(line))}
    needed = json.loads((staging / "missing.json").read_text())["items"]
    keys = {(row["language"], row["text"], row["voice"]) for row in json.loads((ROOT / "audio/known-audio-defects.json").read_text())["defects"] if row.get("requiresPronunciationReview")}
    work = [(item["language"], item["text"], voice) for item in needed for voice in item["neededVariants"] if (item["text"] == args.target if args.target else (item["language"], item["text"], voice) in keys)][:args.limit]
    output = args.output; output.mkdir(parents=True, exist_ok=True)
    model = WhisperModel("small", device="cpu", compute_type="int8", download_root=str(ROOT / "audio/models"))
    timings = {}
    with (output / "metadata.jsonl").open("a") as log:
        for language, text, voice in work:
            target = quality.normalize(text, language).split()
            parents = [clip for clip in pack["clips"] if clip["language"] == language and clip["voice"] == voice and len(quality.normalize(clip["text"]).split()) > len(target) and " ".join(target) in quality.normalize(clip["text"]).split(" / ")[0]]
            parents.sort(key=lambda clip: (not bool(clip.get("reviewedAt")), len(quality.normalize(clip["text"]).split())))
            for parent in parents:
                source = rows[parent["sha256"]]
                if parent["sha256"] not in timings:
                    segments, _ = model.transcribe(source["file"], language=language, beam_size=5, word_timestamps=True, condition_on_previous_text=False, temperature=0)
                    segments = list(segments)
                    # Alignment must recover the complete checked parent first.
                    if quality.normalize(" ".join(segment.text for segment in segments), language) != quality.normalize(parent["text"], language):
                        timings[parent["sha256"]] = []
                    else:
                        timings[parent["sha256"]] = [word for segment in segments for word in segment.words]
                words = timings[parent["sha256"]]
                for index in range(len(words) - len(target) + 1):
                    if [quality.normalize(word.word, language) for word in words[index:index+len(target)]] != target:
                        continue
                    start = max(0, words[index].start - .015)
                    end = words[index+len(target)-1].end + .015
                    if index:
                        start = max(start, words[index-1].end)
                    if index+len(target) < len(words):
                        end = min(end, words[index+len(target)].start)
                    if end-start < .08:
                        continue
                    signature = hashlib.sha256(f"fragment-v2:{parent['sha256']}:{start}:{end}:{text}".encode()).hexdigest()[:16]
                    temporary = output / f"candidate-{language}-{voice}-{signature}.wav"
                    # Trim before resetting timestamps and padding. Output seeking
                    # after delay/pad filters can capture the preceding syllable.
                    crop_checked_audio(imageio_ffmpeg.get_ffmpeg_exe(), source["file"], temporary, start, end)
                    digest = hashlib.sha256(temporary.read_bytes()).hexdigest()
                    file = output / f"{language}-{voice}-{digest[:16]}.wav"; temporary.replace(file)
                    row = {"id": f"{language}-{voice}-fragment-{signature}", "language": language, "voice": voice, "sourceText": text, "spokenText": text, "normalizedText": text, "referenceSha256": parent["voiceReferenceSha256"], "normalTempo": parent["normalTempo"], "backend": parent.get("backend"), "recipeSha256": parent.get("recipeSha256"), "paceCorrectionFactor": parent.get("paceCorrectionFactor", 1), "sha256": digest, "file": file.name, "sourceSha256": parent["sha256"], "sourceClip": parent["id"], "startSeconds": start, "endSeconds": end, "fragmentVersion": 3, "approved": False}
                    log.write(json.dumps(row, ensure_ascii=False)+"\n");log.flush()
                    print(json.dumps({"target":text,"voice":voice,"parent":parent["text"],"file":str(file)},ensure_ascii=False), flush=True)
                    break
                else:
                    continue
                break

if __name__ == "__main__": main()
