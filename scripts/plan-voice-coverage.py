"""Plan incremental audio work from authored text and learner-approved voices.

The plan is data only. Generation and publication remain separate quality gates.
"""

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PRIORITY = {
    "sentence": 0, "transform": 0, "mastery": 0, "bridge-mastery": 0,
    "exercise-audio": 1, "answer": 1, "vocabulary": 1,
    "daily-phrase": 2, "choice-audio": 2,
}


def read_jsonl(path: Path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def key(language: str, text: str, voice: str):
    return language, unicodedata.normalize("NFC", text).strip(), voice


def generation_signature(settings):
    material = {"inferenceTimesteps": settings["inferenceTimesteps"],
                "referenceSha256": settings["referenceSha256"],
                "normalTempo": float(settings.get("normalTempo", 1.0)),
                "promptMode": False, "pipelineVersion": 6,
                "model": "openbmb/VoxCPM2", "cfgValue": 2.0}
    return hashlib.sha256(json.dumps(material, sort_keys=True).encode()).hexdigest()[:12]


def build_plan(inventory, registry, pack, metadata, failures, mode="first-pass", defects=None):
    voices = {}
    clips_by_id = {clip["id"]: clip for clip in pack["clips"]}
    for entry in registry["voices"]:
        language, voice = entry["language"], entry["voice"]
        if (language, voice) in voices:
            raise ValueError(f"Duplicate voice variant: {language}/{voice}")
        reference = entry.get("sourceReference") or clips_by_id.get(entry["referenceClipId"])
        if not reference or reference["language"] != language or not reference.get("reviewedAt"):
            raise ValueError(f"Voice reference needs learner review: {language}/{voice}")
        voices[(language, voice)] = {**entry, "referenceSha256": reference["sha256"]}

    blocked = set(pack.get("blockedAudioSha256", []))
    reported_keys = {key(clip["language"], clip["normalizedText"], clip.get("voice"))
                     for clip in pack["clips"] if clip.get("sha256") in blocked}
    reported_keys.update(key(row["language"], row["text"], row.get("voice"))
                         for row in (defects or []) if row.get("requiresPronunciationReview"))
    published = {}
    for clip in pack["clips"]:
        settings = voices.get((clip["language"], clip.get("voice")))
        if not settings or clip.get("sha256") in blocked:
            continue
        state = "published-reviewed" if clip.get("reviewedAt") else "published-provisional"
        if not clip.get("reviewedAt") and (
            float(clip.get("normalTempo", 1.0)) != float(settings.get("normalTempo", 1.0))
            or (re.search(r"[/／·]", clip.get("text", clip["normalizedText"]))
                and clip.get("generationSignature") != generation_signature(settings))
        ):
            state = "replacement-needed"
        published[key(clip["language"], clip["normalizedText"], clip["voice"])] = state
    generated = set()
    for row in metadata:
        settings = voices.get((row.get("language"), row.get("voice")))
        if (settings and row.get("file") and row.get("pipelineVersion") == 6
                and row.get("referenceSha256") == settings["referenceSha256"]
                and row.get("inferenceTimesteps") == settings["inferenceTimesteps"]
                and row.get("normalTempo", 1.0) == float(settings.get("normalTempo", 1.0))
                and row.get("promptMode") is False and row.get("generationSignature")):
            generated.add(key(row["language"], row["normalizedText"], row["voice"]))
    failed = set()
    for row in failures:
        parts = row.get("id", "").split("-", 2)
        settings = voices.get((parts[0], parts[1])) if len(parts) == 3 else None
        if settings and row.get("generationSignature") == generation_signature(settings) and isinstance(row.get("text"), str):
            failed.add(key(parts[0], row["text"], parts[1]))

    lesson_order = {}
    for item in inventory["items"]:
        for source in item.get("sources", []):
            lesson_order.setdefault(source.rsplit(":", 1)[0], len(lesson_order))

    counts = Counter()
    queue = []
    for index, item in enumerate(inventory["items"]):
        language, text = item["language"], item["text"]
        variants = [voice for candidate_language, voice in voices if candidate_language == language]
        if not variants:
            raise ValueError(f"No learner-approved voice for {language}: {text}")
        needed = []
        replacements = []
        for voice in variants:
            identity = key(language, text, voice)
            state = published.get(identity) or ("generated-unpublished" if identity in generated else "failed" if identity in failed else "missing")
            if state == "replacement-needed":
                replacements.append(voice)
                if identity in generated:
                    state = "generated-unpublished"
                elif identity in failed:
                    state = "failed"
            counts[state] += 1
            if state in ("missing", "replacement-needed", "failed") and (mode == "all" or mode == "first-pass" and state in ("missing", "replacement-needed") or mode == "retry" and state == "failed"):
                needed.append(voice)
        if needed:
            sources = item.get("sources", [])
            order = min((lesson_order[source.rsplit(":", 1)[0]] for source in sources), default=index)
            stage = min((SOURCE_PRIORITY.get(source.rsplit(":", 1)[-1], 3) for source in sources), default=3)
            focused = any(key(language, text, voice) in reported_keys for voice in needed)
            if focused:
                stage = -1
            queue.append((stage, order, index, {**item, "neededVariants": needed,
                **({"replacementVariants": replacements} if replacements else {}),
                **({"needsFocusedListeningReview": True} if focused else {})}))

    queue.sort(key=lambda value: value[:3])
    expected = sum(counts.values())
    report = {"expectedVariants": expected, "publishedVariants": counts["published-reviewed"] + counts["published-provisional"],
              "states": dict(counts), "queuedItems": len(queue), "queuedVariants": sum(len(item[3]["neededVariants"]) for item in queue), "mode": mode}
    return {"schemaVersion": 1, "sourceLessonCount": inventory.get("sourceLessonCount"), "report": report,
            "items": [item for _, _, _, item in queue]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", type=Path, default=ROOT / "audio/inventory-es-vi.json")
    parser.add_argument("--voice-registry", type=Path, default=ROOT / "audio/voice-registry.json")
    parser.add_argument("--pack", type=Path, default=ROOT / "public/audio/packs/approved.json")
    parser.add_argument("--generated", type=Path, default=ROOT / "audio/generated/voice-coverage-v3")
    parser.add_argument("--mode", choices=("first-pass", "retry", "all"), default="first-pass")
    parser.add_argument("--output", type=Path, default=ROOT / "audio/generated/voice-work-plan.json")
    args = parser.parse_args()
    plan = build_plan(json.loads(args.inventory.read_text(encoding="utf-8")),
                      json.loads(args.voice_registry.read_text(encoding="utf-8")),
                      json.loads(args.pack.read_text(encoding="utf-8")),
                      read_jsonl(args.generated / "metadata.jsonl"), read_jsonl(args.generated / "failures.jsonl"), args.mode,
                      json.loads((ROOT / "audio/known-audio-defects.json").read_text())["defects"])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(plan["report"], ensure_ascii=False))


if __name__ == "__main__":
    main()
