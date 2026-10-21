"""Stage exact human-accepted cloud recordings; never generates or deploys audio."""
import argparse
import json
import shutil
from audio_pipeline import ROOT, WORK, accepted_cloud_policies, canonical, digest, inspect_wav, permitted, read, save


def prepare():
    seed = read(ROOT / "ios/LinguaThread/NativeAudio/manifest.json")
    cloud = accepted_cloud_policies()
    base = [p for p in seed["voicePolicies"] if not str(p.get("backend", "")).startswith("gemini/")]
    policies = base + cloud
    blocked = set(seed.get("blockedAudioSha256", []))
    blocked.update(r["sha256"] for r in read(ROOT / "audio/known-audio-defects.json")["defects"] if r["status"] == "blocked")
    clips, copies = [], {}
    for approval in read(ROOT / "audio/cloud-listening-approvals.json")["clips"]:
        receipt = read(WORK / (approval["requestKey"] + ".json"))
        task, sha = receipt["task"], receipt["sha256"]
        if not approval.get("reviewedAt") or not approval.get("approvalEvidence") or sha != approval["sha256"] or task["key"] != approval["requestKey"]:
            raise ValueError("Exact-file listening acceptance is required.")
        request = task["request"]
        if digest(canonical(request).encode()) != task["key"] or receipt["file"] != sha + ".wav":
            raise ValueError("Cloud receipt identity changed.")
        policy = next(p for p in cloud if p["language"] == task["language"] and p["voice"] == task["role"])
        recipe = {k: v for k, v in request.items() if k != "text"}
        if digest(canonical(recipe).encode()) != policy["recipeSha256"]:
            raise ValueError("Candidate differs from the accepted voice recipe.")
        source = WORK / receipt["file"]
        data = source.read_bytes()
        if digest(data) != sha or inspect_wav(data)["status"] != "technical-pass":
            raise ValueError("Accepted recording is missing, changed or technically invalid.")
        clip = {"id": "cloud-" + task["key"][:20], "language": task["language"], "voice": task["role"],
                "text": task["displayText"], "normalizedText": " ".join(task["displayText"].split()),
                "file": receipt["file"], "url": "linguathread-audio://pack/" + receipt["file"], "sha256": sha,
                "voiceReferenceSha256": policy["referenceSha256"], "voiceApprovalBasis": "explicit-listening-approval",
                "backend": policy["backend"], "recipeSha256": policy["recipeSha256"], "normalTempo": 1,
                "paceCorrectionFactor": 1, "auditVersion": 2, "qualityCheck": "human-text-pace-clarity",
                "reviewedAt": approval["reviewedAt"], "preferred": True, "requestKey": task["key"]}
        if not permitted(clip, policies, blocked): raise ValueError("Accepted recording failed catalog admission.")
        clips.append(clip); copies[clip["file"]] = source
    return seed, policies, clips, copies


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    seed, policies, clips, copies = prepare()
    if args.apply:
        seed["voicePolicies"] = policies
        save(ROOT / "ios/LinguaThread/NativeAudio/manifest.json", seed)
        library_path = ROOT / "public/audio/native/library.json"
        library = read(library_path)
        by_sha = {r["sha256"]: r for r in library["clips"]}
        by_sha.update({r["sha256"]: r for r in clips})
        library.update(clips=list(by_sha.values()), approvedAt="2026-10-21")
        inventory = read(ROOT / "audio/inventory-es-vi.json")
        for clip in clips:
            shutil.copy2(copies[clip["file"]], ROOT / "public/audio/native/assets" / clip["file"])
            for item in inventory["items"]:
                if (item["language"], item["text"]) == (clip["language"], clip["normalizedText"]):
                    for source in item["sources"]:
                        lesson = source.split(":", 1)[0]
                        urls = library.setdefault("lessonAudio", {}).setdefault(lesson, [])
                        if clip["url"] not in urls: urls.append(clip["url"])
        library_path.write_text(json.dumps(library, ensure_ascii=False, separators=(",", ":")))
        web_path = ROOT / "public/audio/packs/approved.json"
        web = read(web_path)
        existing = {r["sha256"]: r for r in web["clips"]}
        existing.update({r["sha256"]: dict(r, url="/audio/native/assets/" + r["file"]) for r in clips})
        web.update(clips=list(existing.values()), approvedAt="2026-10-21", packVersion="approved-cloud-20261021")
        save(web_path, web)
        staged_path = ROOT / "audio/generated/ios-approved-v1/manifest.json"
        staged = read(staged_path)
        existing = {r["sha256"]: r for r in staged["clips"]}
        existing.update({r["sha256"]: r for r in clips})
        staged.update(clips=list(existing.values()), voicePolicies=policies)
        save(staged_path, staged)
    print(canonical({"acceptedClips": len(clips), "applied": args.apply, "generated": 0, "deployed": False, "requiresNativeBuild": 12}))


if __name__ == "__main__": main()
