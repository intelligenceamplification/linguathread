"""Publish existing validated audio for at most two units. Never synthesizes audio."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def prepare(lesson, units=2):
    if units not in (1, 2):
        raise ValueError("Only one or two units can be published per operation.")
    match = re.fullmatch(r"[abc][12]-u(\d+)-[a-z0-9-]+", lesson)
    if not match:
        raise ValueError("A published lesson ID is required.")
    start = int(match[1])
    inventory = json.loads((ROOT / "audio/inventory-es-vi.json").read_text())
    source = ROOT / "audio/generated/ios-approved-v1"
    prepared = json.loads((source / "manifest.json").read_text())
    seed = json.loads((ROOT / "ios/LinguaThread/NativeAudio/manifest.json").read_text())
    if prepared.get("voicePolicies") != seed.get("voicePolicies"):
        raise ValueError("Prepared voices differ from the installed approved policy.")
    wanted = {}
    for item in inventory["items"]:
        sources = []
        for location in item["sources"]:
            source_lesson = location.split(":", 1)[0]
            unit = re.match(r"[abc][12]-u(\d+)-", source_lesson)
            if unit and start <= int(unit[1]) < start + units:
                sources.append(source_lesson)
        if sources:
            wanted[(item["language"], item["text"])] = sorted(set(sources))
    if not any(lesson in locations for locations in wanted.values()):
        raise ValueError("Lesson not found in authored inventory.")
    library_path = ROOT / "public/audio/native/library.json"
    library = json.loads(library_path.read_text())
    blocked = set(seed.get("blockedAudioSha256", []) + library.get("blockedAudioSha256", []))
    copies = {}
    selected = [clip for clip in prepared["clips"] if (clip["language"], clip["normalizedText"]) in wanted]
    if not selected:
        raise ValueError("No prepared audio exists for this window. Nothing published.")
    clips = {clip["sha256"]: clip for clip in library["clips"] if clip["sha256"] not in blocked}
    for clip in selected:
        file = clip["file"]
        if Path(file).name != file or clip["sha256"] in blocked:
            raise ValueError("Unsafe or blocked recording.")
        # The builder stages media separately from its planning manifest.
        path = ROOT / "audio/generated/ios-download-library/assets" / file
        if not path.exists():
            path = ROOT / "public/audio/native/assets" / file
        if hashlib.sha256(path.read_bytes()).hexdigest() != clip["sha256"]:
            raise ValueError("Prepared recording missing or changed.")
        clips[clip["sha256"]] = clip
        copies[file] = path
        for location in wanted[(clip["language"], clip["normalizedText"])]:
            library.setdefault("lessonAudio", {}).setdefault(location, []).append(clip["url"])
    library["clips"] = list(clips.values())
    library["blockedAudioSha256"] = sorted(blocked)
    library["lessonAudio"] = {lesson: sorted(set(urls)) for lesson, urls in library["lessonAudio"].items()}
    library["approvedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    covered = {(clip["language"], clip["normalizedText"]) for clip in selected}
    missing = [{"language": lang, "text": text} for lang, text in wanted if (lang, text) not in covered]
    return library, copies, {"lesson": lesson, "units": units, "requiredTexts": len(wanted), "availableTexts": len(covered), "missingTexts": missing, "selectedVariants": len(selected), "catalogVariants": len(clips), "generatedClips": 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lesson", required=True)
    parser.add_argument("--units", type=int, choices=[1, 2], default=2)
    parser.add_argument("--apply", action="store_true", help="Write checked files/catalog; does not deploy")
    args = parser.parse_args()
    library, copies, report = prepare(args.lesson, args.units)
    with tempfile.TemporaryDirectory(prefix="nuevo-flow-publish-") as scratch:
        scratch = Path(scratch)
        staged = scratch / "library.json"
        staged.write_text(json.dumps(library, ensure_ascii=False, separators=(",", ":")))
        binary = scratch / "verify"
        env = dict(os.environ, SWIFT_MODULECACHE_PATH="/tmp/nuevo-flow-swift-modules", CLANG_MODULE_CACHE_PATH="/tmp/nuevo-flow-clang-modules")
        subprocess.run(["swiftc", "-swift-version", "5", str(ROOT / "ios/LinguaThread/NativeAudioCatalog.swift"), str(ROOT / "scripts/verify-download-audio.swift"), "-o", str(binary)], env=env, check=True)
        subprocess.run([str(binary), str(ROOT / "ios/LinguaThread/NativeAudio/manifest.json"), str(staged)], check=True)
        if args.apply:
            destination = ROOT / "public/audio/native"
            for file, source in copies.items():
                target = destination / "assets" / file
                if not target.exists() or hashlib.sha256(target.read_bytes()).hexdigest() != hashlib.sha256(source.read_bytes()).hexdigest():
                    shutil.copy2(source, target)
            temporary = destination / "library.json.tmp"
            shutil.copy2(staged, temporary)
            temporary.replace(destination / "library.json")
    print(json.dumps(dict(report, applied=args.apply), ensure_ascii=False))


if __name__ == "__main__":
    main()
