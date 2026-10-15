"""Fail an installable iOS build if its isolated instructional pack is incomplete."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import unicodedata

ROOT = Path(__file__).resolve().parents[1]

def verify(directory, inventory, registry, defects):
    pack = json.loads((directory / "manifest.json").read_text())
    if not pack.get("releaseReady") or not pack.get("approvedAt"):
        raise ValueError("Native audio is staging-only; not ready for device installation.")
    if pack.get("inventorySha256") != hashlib.sha256(inventory.read_bytes()).hexdigest() or pack.get("voiceRegistrySha256") != hashlib.sha256(registry.read_bytes()).hexdigest():
        raise ValueError("Native pack does not match the current inventory and approved voices.")
    def key(language, text, voice): return language, " ".join(unicodedata.normalize("NFC", text).split()), voice
    voices = {(row["language"], row["voice"]): row for row in json.loads(registry.read_text())["voices"]}
    policies = [{"language": row["language"], "voice": row["voice"], "referenceSha256": row.get("sourceReference", {}).get("sha256"), "backend": row.get("nativeBackend"), "recipeSha256": hashlib.sha256((ROOT / row["nativeRecipePath"]).read_bytes()).hexdigest() if row.get("nativeRecipePath") else None, "normalTempo": row.get("normalTempo", 1), **({"requiredAuditModel": row["nativeAuditModel"]} if row.get("nativeAuditModel") else {})} for row in voices.values()]
    if pack.get("voicePolicies") != policies:
        raise ValueError("Native download policies do not match the approved voices.")
    authored = json.loads(inventory.read_text())
    if authored.get("scope"):
        spec = importlib.util.spec_from_file_location("audio_scope", ROOT / "scripts/scope-native-audio.py")
        scope = importlib.util.module_from_spec(spec); spec.loader.exec_module(scope)
        scope.validate_scope(authored)
        if pack.get("scope") != authored["scope"]:
            raise ValueError("Native pack has the wrong learning window")
    for source, digest in authored.get("sourceHashes", {}).items():
        if hashlib.sha256((ROOT / source).read_bytes()).hexdigest() != digest:
            raise ValueError("Audio inventory is stale relative to authored lesson controls.")
    expected = {key(item["language"], item["text"], voice) for item in authored["items"] for language, voice in voices if language == item["language"]}
    blocked = {row["sha256"] for row in json.loads(defects.read_text())["defects"] if row["status"] == "blocked"}
    actual = set()
    for clip in pack["clips"]:
        identity = key(clip["language"], clip["text"], clip["voice"])
        if identity not in expected or identity in actual or clip["sha256"] in blocked:
            raise ValueError("Unexpected, duplicate, or blocked audio in native pack.")
        if clip.get("normalizedText") != identity[1]:
            raise ValueError("Audio lookup text does not match its authored utterance.")
        voice = voices[(clip["language"], clip["voice"])]
        if voice.get("nativeBackend") and clip.get("backend") != voice["nativeBackend"]:
            raise ValueError("Superseded Spanish backend in native audio.")
        if voice.get("nativeRecipePath") and clip.get("recipeSha256") != hashlib.sha256((ROOT / voice["nativeRecipePath"]).read_bytes()).hexdigest():
            raise ValueError("Superseded Spanish recipe in native audio.")
        if clip.get("voiceReferenceSha256") != voice.get("sourceReference", {}).get("sha256") or clip.get("voiceApprovalBasis") not in ("reference-hash", "explicit-listening-approval"):
            raise ValueError("Unproven voice identity in native audio.")
        if clip["voiceApprovalBasis"] == "explicit-listening-approval" and not clip.get("reviewedAt"):
            raise ValueError("Explicit voice acceptance has no review record.")
        if clip.get("auditVersion") != 2 or clip.get("qualityCheck") not in ("automated-text-pace-clarity", "human-text-pace-clarity"):
            raise ValueError("Unscreened native audio.")
        if clip["qualityCheck"] == "human-text-pace-clarity" and not clip.get("reviewedAt"):
            raise ValueError("Human audio acceptance has no review record.")
        if clip["qualityCheck"] == "automated-text-pace-clarity" and voice.get("nativeAuditModel") and clip.get("auditModel") != voice["nativeAuditModel"]:
            raise ValueError("Superseded native audio recognizer.")
        if clip["qualityCheck"] == "automated-text-pace-clarity" and clip.get("reviewedAt"):
            raise ValueError("Automated screening cannot claim human listening review.")
        if float(clip.get("normalTempo", 1)) != float(voices[(clip["language"], clip["voice"])].get("normalTempo", 1)):
            raise ValueError("Native audio uses an outdated teacher pace.")
        if not .75 <= float(clip.get("paceCorrectionFactor", 1)) <= 1:
            raise ValueError("Native audio uses an excessive pace correction.")
        if Path(clip["file"]).name != clip["file"] or clip["url"] != "linguathread-audio://pack/" + clip["file"]:
            raise ValueError("Legacy or unsafe playback URL in native pack.")
        if hashlib.sha256((directory / clip["file"]).read_bytes()).hexdigest() != clip["sha256"]:
            raise ValueError("Changed or missing native audio file.")
        actual.add(identity)
    if actual != expected:
        raise ValueError(f"Incomplete native audio: {len(actual)}/{len(expected)} variants.")
    return len(actual)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--allow-staging", action="store_true", help="Only for an unsigned compile check; never an installable build")
    args = parser.parse_args()
    if args.allow_staging:
        print("Unsigned staging compile: no device release claimed.")
    else:
        try:
            bundle = ROOT / "ios/LinguaThread/NativeAudio"
            path = json.loads((bundle / "manifest.json").read_text()).get("inventoryPath", "audio/inventory-es-vi.json")
            if path not in ("audio/inventory-es-vi.json", "audio/inventory-native-personal.json"):
                raise ValueError("Unsupported native inventory path")
            count = verify(bundle, ROOT / path, ROOT / "audio/voice-registry.json", ROOT / "audio/known-audio-defects.json")
            print(f"Native pack verified: {count} variants.")
        except (ValueError, OSError, KeyError) as error:
            raise SystemExit(str(error))
