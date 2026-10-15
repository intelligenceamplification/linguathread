"""Stage an isolated iPhone pack. Installation requires complete checked coverage.

No legacy playback URLs survive. Voice-family approval is never utterance review.
"""
import argparse
import hashlib
import importlib.util
import json
import shutil
import time
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def normalized(text):
    return " ".join(unicodedata.normalize("NFC", text).split())

def identity(row):
    return row["language"], normalized(row.get("sourceText", row.get("text", ""))), row["voice"]

def jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()] if path.exists() else []

def verified_voice_family(reference_sha, approved_reference, digest, fresh_reviews):
    # Historical review flags in the mixed web pack cannot authorize an older
    # voice. An exception needs current, exact-file listening acceptance.
    return reference_sha == approved_reference or digest == approved_reference or digest in fresh_reviews

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "audio/generated/ios-approved-v1")
    parser.add_argument("--inventory", type=Path, default=ROOT / "audio/inventory-es-vi.json")
    parser.add_argument("--audit", type=Path)
    parser.add_argument("--listening-review", type=Path, help="Current-release human adjudication records (auditVersion 2), bound to exact hashes")
    parser.add_argument("--install", action="store_true", help="Populate Xcode resources only after the complete release gate")
    parser.add_argument("--export-library", type=Path, help="Stage verified download assets and index; never deploys")
    args = parser.parse_args()
    pack = json.loads((ROOT / "public/audio/packs/approved.json").read_text())
    inventory = json.loads(args.inventory.read_text())
    if inventory.get("scope"):
        spec = importlib.util.spec_from_file_location("audio_scope", ROOT / "scripts/scope-native-audio.py")
        scope = importlib.util.module_from_spec(spec); spec.loader.exec_module(scope)
        scope.validate_scope(inventory)
    for source, digest in inventory.get("sourceHashes", {}).items():
        if hashlib.sha256((ROOT / source).read_bytes()).hexdigest() != digest:
            raise SystemExit("Audio inventory is stale; re-export published lesson and control coverage.")
    registry = json.loads((ROOT / "audio/voice-registry.json").read_text())
    defects = json.loads((ROOT / "audio/known-audio-defects.json").read_text())["defects"]
    blocked = {row["sha256"] for row in defects if row["status"] == "blocked"}
    review_keys = {identity(row) for row in defects if row.get("requiresPronunciationReview")}
    voices = {(row["language"], row["voice"]): row for row in registry["voices"]}
    references = {}
    for key, voice in voices.items():
        reference = voice.get("sourceReference") or next(row for row in pack["clips"] if row["id"] == voice["referenceClipId"])
        path = ROOT / "public" / reference["url"].lstrip("/")
        if not reference.get("reviewedAt") or hashlib.sha256(path.read_bytes()).hexdigest() != reference["sha256"]:
            raise ValueError(f"Unverified voice reference: {key}")
        references[key] = reference["sha256"]
    expected = {(item["language"], normalized(item["text"]), voice) for item in inventory["items"] for language, voice in voices if language == item["language"]}
    metadata = {}
    for path in sorted((ROOT / "audio/generated").glob("*/metadata.jsonl")):
        if path.parent == args.output:
            continue
        for row in jsonl(path):
            # Carrier recordings are extraction inputs, never lesson playback.
            if row.get("candidateRole") == "context-parent":
                continue
            row["file"] = str(path.parent / row["file"])
            metadata[row["sha256"]] = row
    candidates = {}
    rejected = []
    for row in pack["clips"]:
        if (row["language"], row.get("voice")) not in voices:
            continue
        candidate = dict(row, sourceText=row["text"], file=str(ROOT / "public" / row["url"].lstrip("/")))
        candidates[row["sha256"]] = candidate
    candidates.update(metadata)
    audited = {row["sha256"]: row for row in jsonl(args.audit or args.output / "audit.jsonl") if row.get("auditVersion") == 2}
    # New synthesis has already screened the final encoded bytes. Reuse that
    # hash-bound result rather than transcribing the same file twice.
    for digest, row in metadata.items():
        check = row.get("qualityCheck", {})
        if isinstance(check, dict) and check.get("auditVersion") == 2:
            audited.setdefault(digest, check)
    # Vietnamese release decisions use the validated original recognizer.
    # Earlier converted/generic results must never override its rejection.
    spec = importlib.util.spec_from_file_location("native_vi_reference", ROOT / "scripts/audit-native-vietnamese.py")
    native_vi_reference = importlib.util.module_from_spec(spec); spec.loader.exec_module(native_vi_reference)
    spec = importlib.util.spec_from_file_location("audio_text_check", ROOT / "scripts/audit-voice-audio.py")
    audio_text_check = importlib.util.module_from_spec(spec); spec.loader.exec_module(audio_text_check)
    vietnamese_audits = {}
    for path in sorted((ROOT / "audio/generated").glob("*/audit.jsonl")):
        # Experimental control files can deliberately attach wrong expected
        # text to real bytes; only matching real candidate records may qualify.
        for check in jsonl(path):
            candidate = candidates.get(check.get("sha256"))
            if candidate and check.get("model") == native_vi_reference.MODEL_ID and check.get("auditVersion") == 2 and normalized(check.get("expected", "")) == normalized(candidate.get("spokenText") or candidate.get("sourceText", "")) and not check.get("id", "").startswith("negative-"):
                vietnamese_audits[check["sha256"]] = check
    approved = {row["sha256"]: row for row in pack["clips"] if row.get("reviewedAt")}
    fresh_reviews = {}
    if args.listening_review:
        for review in json.loads(args.listening_review.read_text())["reviews"]:
            if review.get("approved") is True and review.get("auditVersion") == 2 and review.get("reviewedAt") and review.get("reviewedBy") and review.get("evidence"):
                candidate = candidates.get(review["sha256"])
                if not candidate or identity(candidate) != identity(review):
                    raise ValueError("Human listening acceptance does not match the exact candidate.")
                fresh_reviews[review["sha256"]] = review
                approved[review["sha256"]] = dict(review, reviewEvidence=review["evidence"])
    eligible = []
    for digest, row in candidates.items():
        if "voice" not in row or identity(row) not in expected:
            continue
        key = (row["language"], row["voice"])
        required_backend = voices[key].get("nativeBackend")
        if required_backend and row.get("backend") != required_backend:
            rejected.append({"id": row["id"], "reason": "superseded-native-backend"}); continue
        recipe_path = voices[key].get("nativeRecipePath")
        if recipe_path and row.get("recipeSha256") != hashlib.sha256((ROOT / recipe_path).read_bytes()).hexdigest():
            rejected.append({"id": row["id"], "reason": "superseded-native-recipe"}); continue
        if digest in blocked:
            rejected.append({"id": row["id"], "reason": "blocked"}); continue
        source = Path(row["file"])
        if not source.is_file() or hashlib.sha256(source.read_bytes()).hexdigest() != digest:
            rejected.append({"id": row["id"], "reason": "asset-hash"}); continue
        proof = metadata.get(row.get("tempoAdjustedFromSha256", digest), row)
        reference_sha = proof.get("referenceSha256")
        if not reference_sha and proof.get("reference"):
            reference_path = ROOT / proof["reference"]
            if reference_path.is_file():
                reference_sha = hashlib.sha256(reference_path.read_bytes()).hexdigest()
        human = approved.get(digest)
        if not verified_voice_family(reference_sha, references[key], digest, fresh_reviews):
            rejected.append({"id": row["id"], "reason": "unproven-voice-family"}); continue
        if float(row.get("normalTempo", 1)) != float(voices[key].get("normalTempo", 1)):
            rejected.append({"id": row["id"], "reason": "outdated-teacher-pace"}); continue
        if identity(row) in review_keys and not (human and human.get("reviewEvidence")):
            rejected.append({"id": row["id"], "reason": "pronunciation-review-required"}); continue
        candidate = dict(row, voiceReferenceSha256=references[key], voiceApprovalBasis="reference-hash" if reference_sha == references[key] or digest == references[key] else "explicit-listening-approval", freshListeningReview=digest in fresh_reviews)
        # Legacy pack flags are not current-release utterance adjudication.
        candidate.pop("reviewedAt", None)
        if digest in fresh_reviews:
            candidate["reviewedAt"] = fresh_reviews[digest]["reviewedAt"]
        eligible.append(candidate)
    args.output.mkdir(parents=True, exist_ok=True)
    # Re-screen retained clips as well as new takes; old audit version cannot qualify.
    (args.output / "metadata.jsonl").write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in eligible))
    selected = {}
    for row in eligible:
        audit = vietnamese_audits.get(row["sha256"]) if row["language"] == "vi" else audited.get(row["sha256"])
        exact_text = bool(audit and audit["wordErrorRate"] == 0 and audit["characterErrorRate"] == 0)
        # Preserve raw ASR error metrics; explicit Spanish letter-name notation
        # has the same narrowly defined equivalence as the actual checker.
        letter_notation = bool(audit and row["language"] == "es" and audio_text_check.text_matches(row.get("spokenText") or row["sourceText"], audit.get("transcript", ""), "es"))
        if not row["freshListeningReview"] and (not audit or audit["status"] != "automated-pass" or audit.get("flags") or not (exact_text or letter_notation)):
            continue
        key = identity(row)
        old = selected.get(key)
        rank = lambda candidate: 2 if candidate["freshListeningReview"] else 1 if candidate.get("reviewedAt") else 0
        if not old or rank(row) > rank(old):
            selected[key] = row
    missing = sorted(expected - selected.keys())
    report = {"expectedVariants": len(expected), "verifiedVariants": len(selected), "eligibleCandidates": len(eligible), "missingVariants": len(missing), "rejectedCandidates": rejected, "releaseReady": not missing}
    (args.output / "coverage.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    missing_by_text = {}
    for language, text, voice in missing:
        item = missing_by_text.setdefault((language, text), {"language": language, "text": text, "neededVariants": []})
        item["neededVariants"].append(voice)
    (args.output / "missing.json").write_text(json.dumps({"items": list(missing_by_text.values())}, ensure_ascii=False, indent=2))
    clips = []
    for row in selected.values():
        name = row["sha256"] + Path(row["file"]).suffix
        clips.append({"id": row["id"], "language": row["language"], "voice": row["voice"], "text": row["sourceText"], "normalizedText": normalized(row["sourceText"]), "file": name, "url": "linguathread-audio://pack/" + name, "sha256": row["sha256"], "voiceReferenceSha256": row["voiceReferenceSha256"], "voiceApprovalBasis": row["voiceApprovalBasis"], "backend": row.get("backend"), "recipeSha256": row.get("recipeSha256"), "normalTempo": row.get("normalTempo", 1), "paceCorrectionFactor": row.get("paceCorrectionFactor", 1), "auditVersion": 2, "auditModel": (vietnamese_audits if row["language"] == "vi" else audited).get(row["sha256"], {}).get("model"), "qualityCheck": "human-text-pace-clarity" if row["freshListeningReview"] else "automated-text-pace-clarity", **({"reviewedAt": row["reviewedAt"]} if row.get("reviewedAt") else {})})
    manifest = {"schemaVersion": 1, "packVersion": "ios-personal-v1" if inventory.get("scope") else "ios-approved-v1", "model": "approved-families", "approvedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "inventoryPath": str(args.inventory.resolve().relative_to(ROOT)), "inventorySha256": hashlib.sha256(args.inventory.read_bytes()).hexdigest(), "voiceRegistrySha256": hashlib.sha256((ROOT / "audio/voice-registry.json").read_bytes()).hexdigest(), "scope": inventory.get("scope"), "voicePolicies": [{"language": v["language"], "voice": v["voice"], "referenceSha256": references[(v["language"], v["voice"])], "backend": v.get("nativeBackend"), "recipeSha256": hashlib.sha256((ROOT / v["nativeRecipePath"]).read_bytes()).hexdigest() if v.get("nativeRecipePath") else None, "normalTempo": v.get("normalTempo", 1), **({"requiredAuditModel": v["nativeAuditModel"]} if v.get("nativeAuditModel") else {})} for v in voices.values()], "releaseReady": not missing, "clips": clips, "blockedAudioSha256": sorted(blocked)}
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    if args.export_library:
        assets = args.export_library / "assets"
        assets.mkdir(parents=True, exist_ok=True)
        lesson_audio = {}
        authored = {(item["language"], normalized(item["text"])): item for item in inventory["items"]}
        for clip in clips:
            row = selected[(clip["language"], clip["normalizedText"], clip["voice"])]
            destination = assets / clip["file"]
            if not destination.exists() or hashlib.sha256(destination.read_bytes()).hexdigest() != clip["sha256"]:
                shutil.copy2(row["file"], destination)
            for source in authored[(clip["language"], clip["normalizedText"])]["sources"]:
                lesson = source.split(":", 1)[0]
                if ":" in source and source.rsplit(":", 1)[-1] in ("sentence", "transform", "mastery", "bridge-mastery", "vocabulary", "anatomy", "daily-phrase"):
                    lesson_audio.setdefault(lesson, set()).add(clip["url"])
        library = {"schemaVersion": 1, "kind": "verified-audio-library", "approvedAt": manifest["approvedAt"], "clips": clips, "blockedAudioSha256": sorted(blocked), "lessonAudio": {lesson: sorted(urls) for lesson, urls in lesson_audio.items()}}
        temporary = args.export_library / "library.json.tmp"
        temporary.write_text(json.dumps(library, ensure_ascii=False, separators=(",", ":")))
        temporary.replace(args.export_library / "library.json")
    if args.install:
        if missing:
            raise SystemExit("Installation blocked: isolated audio coverage is incomplete.")
        destination = ROOT / "ios/LinguaThread/NativeAudio"
        wanted = {row["sha256"] + Path(row["file"]).suffix for row in selected.values()}
        for asset in destination.iterdir():
            if asset.is_file() and asset.suffix in (".wav", ".m4a") and asset.name not in wanted:
                asset.unlink()
        for row in selected.values():
            shutil.copy2(row["file"], destination / (row["sha256"] + Path(row["file"]).suffix))
        (destination / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(json.dumps({key: value for key, value in report.items() if key != "rejectedCandidates"}))

if __name__ == "__main__":
    main()
