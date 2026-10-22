"""Small, offline-first audio planner and bounded cloud audition worker.

No command deploys, alters app voices, records a microphone, or loads a model.
"""
import argparse
import base64
import datetime as dt
import fcntl
import getpass
import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import shutil
import sqlite3
import stat
import struct
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.request
import wave
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "audio/generated/cloud-pipeline"
LOCAL_CONFIG = ".env.audio.local.json"


def configure_free_project(api_key, confirmation, root=ROOT):
    """Save only an explicitly confirmed free-project key, with owner-only access."""
    if confirmation.strip().upper() != "FREE":
        raise ValueError("Free-tier confirmation absent; nothing saved.")
    api_key = api_key.strip()
    if len(api_key) < 20 or any(c.isspace() for c in api_key):
        raise ValueError("Key appears incomplete; nothing saved.")
    config = {"GEMINI_API_KEY": api_key, "AUDIO_FREE_PROJECT_CONFIRMED": "true"}
    fd, temporary = tempfile.mkstemp(prefix=".env.audio-", dir=root)
    try:
        with os.fdopen(fd, "w") as handle:
            json.dump(config, handle)
            handle.write("\n")
        os.replace(temporary, root / LOCAL_CONFIG)
    finally:
        if os.path.exists(temporary): os.unlink(temporary)


def local_environment(root=ROOT, env=None):
    """Read private JSON, never execute a shell env file or print its contents."""
    env = dict(os.environ if env is None else env)
    path = root / LOCAL_CONFIG
    if not os.path.lexists(path): return env
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd) as handle:
        info = os.fstat(handle.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
            raise ValueError("Audio credentials must be an owner-only regular file (chmod 600).")
        if info.st_size > 8192: raise ValueError("Audio credentials file is invalid.")
        try:
            saved = json.load(handle)
        except (ValueError, TypeError):
            raise ValueError("Audio credentials JSON is invalid; run setup again.") from None
    if not isinstance(saved, dict) or set(saved) != {"GEMINI_API_KEY", "AUDIO_FREE_PROJECT_CONFIRMED"} or not all(isinstance(v, str) for v in saved.values()):
        raise ValueError("Audio credentials configuration is invalid.")
    # Do not attach one project's free-tier assertion to a different environment key.
    if not env.get("GEMINI_API_KEY"):
        env.update(saved)
    return env


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def read(path):
    return json.loads(Path(path).read_text())


def save(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(path)


def spoken(text):
    text = unicodedata.normalize("NFC", text)
    return " ".join(re.sub(r"\s*[\/／·]\s*", ", ", text).split())


def safe_media(path, root):
    path = path.resolve()
    permitted = [root / "audio/generated", root / "public/audio", root / "ios/LinguaThread/NativeAudio"]
    return any(folder.resolve() in path.parents for folder in permitted)


def accepted_cloud_policies(root=ROOT):
    """Only explicitly accepted prebuilt profiles become pinned native policies."""
    path = root / "audio/cloud-audio-candidates.json"
    if not path.exists(): return []
    policies = []
    for provider, settings in read(path)["providers"].items():
        for profile in settings["profiles"]:
            if not profile.get("approvedAt"): continue
            reference = profile.get("referenceAudioSha256", "")
            if not re.fullmatch(r"[0-9a-f]{64}", reference) or not profile.get("approvalEvidence"):
                raise ValueError("Accepted cloud voice lacks an auditable listening reference.")
            recipe = {"provider": provider, "model": settings["model"], "voice": profile["voiceId"], "locale": profile["locale"], "settings": profile["settings"], "normalizerVersion": 1}
            policies.append({"language": profile["language"], "voice": profile["role"], "referenceSha256": reference,
                             "backend": provider + "/" + settings["model"], "recipeSha256": digest(canonical(recipe).encode()), "normalTempo": 1})
    return policies


def permitted(row, policies, blocked):
    """Conservative preflight; publication additionally runs the real Swift gate."""
    policy = next((p for p in policies if (p.get("language"), p.get("voice"), p.get("referenceSha256")) == (row.get("language"), row.get("voice"), row.get("voiceReferenceSha256"))), None)
    sha = row.get("sha256", "")
    if not policy or not re.fullmatch(r"[0-9a-f]{64}", sha) or sha in blocked:
        return False
    if row.get("file") not in (sha + ".wav", sha + ".m4a") or row.get("url") != "linguathread-audio://pack/" + row["file"]:
        return False
    if row.get("voiceReferenceSha256") != policy.get("referenceSha256") or row.get("auditVersion") != 2:
        return False
    text = row.get("text", "")
    if not text or row.get("normalizedText") != " ".join(unicodedata.normalize("NFC", text).split()):
        return False
    if not isinstance(row.get("normalTempo"), (float, int)) or abs(row["normalTempo"] - policy["normalTempo"]) >= .0001:
        return False
    for field in ("backend", "recipeSha256"):
        if isinstance(policy.get(field), str) and row.get(field) != policy[field]: return False
    quality = row.get("qualityCheck")
    basis = row.get("voiceApprovalBasis")
    if quality not in ("automated-text-pace-clarity", "human-text-pace-clarity") or basis not in ("reference-hash", "explicit-listening-approval"):
        return False
    if quality == "automated-text-pace-clarity" and ("reviewedAt" in row or (isinstance(policy.get("requiredAuditModel"), str) and row.get("auditModel") != policy["requiredAuditModel"])):
        return False
    if (quality == "human-text-pace-clarity" or basis == "explicit-listening-approval") and not row.get("reviewedAt"):
        return False
    return .75 <= row.get("paceCorrectionFactor", 1) <= 1


def existing(root=ROOT):
    """Find exact files, retaining their original approval metadata unchanged."""
    manifest = read(root / "audio/generated/ios-approved-v1/manifest.json")
    seed = read(root / "ios/LinguaThread/NativeAudio/manifest.json")
    public = read(root / "public/audio/native/library.json")
    if manifest.get("voicePolicies") != seed.get("voicePolicies"):
        raise ValueError("Prepared voice policies differ from the installed approved policy.")
    blocked = set(seed.get("blockedAudioSha256", []) + public.get("blockedAudioSha256", []))
    blocked.update(r["sha256"] for r in read(root / "audio/known-audio-defects.json")["defects"] if r["status"] == "blocked")
    admitted = [r for r in manifest["clips"] if permitted(r, seed["voicePolicies"], blocked)]
    public = dict(public, clips=[r for r in public["clips"] if permitted(r, seed["voicePolicies"], blocked)])
    wanted = {r["sha256"] for r in admitted}
    paths = {}
    for row in admitted:
        if Path(row["file"]).name != row["file"]:
            raise ValueError("Unsafe prepared media filename.")
        for folder in [root / "audio/generated/ios-download-library/assets", root / "public/audio/native/assets", root / "ios/LinguaThread/NativeAudio"]:
            candidate = folder / row["file"]
            if candidate.is_file() and digest(candidate.read_bytes()) == row["sha256"]:
                paths[row["sha256"]] = candidate
                break
    for metadata in (root / "audio/generated").glob("*/metadata.jsonl"):
        for line in metadata.open():
            row = json.loads(line)
            sha = row.get("sha256")
            if sha in wanted and sha not in paths:
                candidate = Path(row.get("file", ""))
                if not candidate.is_absolute():
                    candidate = metadata.parent / candidate
                if safe_media(candidate, root) and candidate.is_file() and digest(candidate.read_bytes()) == sha:
                    paths[sha] = candidate
    usable = [r for r in admitted if r["sha256"] in paths]
    return manifest, public, paths, usable


def audit(root=ROOT):
    manifest, public, paths, usable = existing(root)
    inventory = read(root / "audio/inventory-es-vi.json")
    course = read(root / "audio/generated/ios-approved-v1/curriculum.json")["lessons"]
    ids = {r["id"] for r in course}
    items = [r for r in inventory["items"] if any(s.split(":")[0] in ids for s in r["sources"])]
    prepared = {(r["language"], r["normalizedText"]) for r in usable}
    published = set()
    published_variants = 0
    for row in public["clips"]:
        path = root / "public/audio/native/assets" / row["file"]
        if path.is_file() and digest(path.read_bytes()) == row["sha256"]:
            published.add((row["language"], row["normalizedText"]))
            published_variants += 1
    lessons = []
    for lesson in course:
        required = {(r["language"], r["text"]) for r in items if any(s.startswith(lesson["id"] + ":") for s in r["sources"])}
        lessons.append({"id": lesson["id"], "level": lesson["level"], "unit": lesson["unit"], "requiredTexts": len(required),
                        "preparedTexts": len(required & prepared), "publishedTexts": len(required & published),
                        "audioReady": bool(required) and required <= published,
                        "missingPublished": [{"language": lang, "text": text} for lang, text in sorted(required - published)]})
    return {"kind": "audio-readiness", "generatedClips": 0, "preparedEntries": len(manifest["clips"]),
            "recoverableExactFiles": len(paths), "usablePreparedVariants": len(usable),
            "publishedVariants": published_variants, "eligiblePublishedEntries": len(public["clips"]), "readyLessons": sum(r["audioReady"] for r in lessons),
            "totalLessons": len(lessons), "launchReady": all(r["audioReady"] for r in lessons),
            "coverageIsNotPronunciationReview": True, "lessons": lessons}


def make_plan(provider, benchmark=False, lesson=None, root=ROOT, limit=18, offset=0, main_sentences=False):
    if not 1 <= limit <= 64 or offset < 0:
        raise ValueError("Plans allow 1–64 new requests per batch and a nonnegative offset.")
    config = read(root / "audio/cloud-audio-candidates.json")
    profiles = config["providers"][provider]["profiles"]
    if main_sentences:
        if benchmark: raise ValueError("Main-sentence upgrades require an authored lesson window.")
        profiles = [profile for profile in profiles if profile.get("approvedAt")]
        if not profiles: raise ValueError("Approve a voice before planning its lesson upgrade.")
    _, _, _, reusable = existing(root)
    reuse = {(r["language"], r["normalizedText"], r["voice"]): r["sha256"] for r in reusable}
    if benchmark:
        items = config["benchmark"]
    else:
        if not lesson or not re.fullmatch(r"[abc][12]-u\d+-[a-z0-9-]+", lesson):
            raise ValueError("Specify an authored lesson for a two-unit plan, or --benchmark.")
        course = read(root / "audio/generated/ios-approved-v1/curriculum.json")["lessons"]
        anchor = next((r for r in course if r["id"] == lesson), None)
        if anchor is None: raise ValueError("Authored lesson not found.")
        units = list(dict.fromkeys((r["level"], r["unit"]) for r in course))
        start = units.index((anchor["level"], anchor["unit"]))
        allowed = {r["id"] for r in course if (r["level"], r["unit"]) in units[start:start + 2]}
        items = [r for r in read(root / "audio/inventory-es-vi.json")["items"] if any(s.split(":")[0] in allowed for s in r["sources"])]
    if main_sentences:
        main_texts = {(language, row["sentence"][field]) for row in course if row["id"] in allowed for language, field in (("es", "target"), ("vi", "bridge"))}
        items = [item for item in items if (item["language"], item["text"]) in main_texts]
        # An explicit voice upgrade reuses only the accepted provider's renditions.
        # Ordinary coverage plans continue to reuse any working checked recording.
        reusable = [row for row in reusable if row.get("backend") == provider + "/" + config["providers"][provider]["model"]]
        reuse = {(row["language"], row["normalizedText"], row["voice"]): row["sha256"] for row in reusable}
    tasks = {}
    for item in items:
        available = [r for r in reusable if (r["language"], r["normalizedText"]) == (item["language"], item["text"])]
        for profile in profiles:
            if profile["language"] != item["language"]:
                continue
            identity = {"provider": provider, "model": config["providers"][provider]["model"], "voice": profile["voiceId"],
                        "locale": profile["locale"], "text": spoken(item["text"]), "settings": profile["settings"], "normalizerVersion": 1}
            key = digest(canonical(identity).encode())
            # A working approved rendition is enough for coverage. Do not generate
            # alternate genders just to fill a matrix during this repair.
            reusable_sha = reuse.get((item["language"], item["text"], profile["role"])) or (available[0]["sha256"] if available and not main_sentences else None)
            tasks[key] = {"key": key, "request": identity, "displayText": item["text"], "language": profile["language"],
                          "role": profile["role"], "reuseSha256": None if benchmark else reusable_sha}
    missing = [r for r in tasks.values() if not r["reuseSha256"]]
    selected = [r for r in tasks.values() if r["reuseSha256"]] + missing[offset:offset + limit]
    body = {"schemaVersion": 1, "kind": "audition" if benchmark else "lesson-candidates", "provider": provider,
            "scope": "benchmark" if benchmark else lesson + (":main-sentences" if main_sentences else ""), "tasks": selected}
    return dict(body, id=digest(canonical(body).encode()), generationRequests=sum(not r["reuseSha256"] for r in selected),
                estimatedCharacters=sum(len(r["request"]["text"]) + len(r["request"]["settings"].get("style", "")) for r in selected if not r["reuseSha256"]),
                totalMissingRequests=len(missing), nextOffset=offset + limit if offset + limit < len(missing) else None)


def inspect_wav(data):
    if len(data) > 10 * 1024 * 1024:
        raise ValueError("Audio exceeds the candidate size budget.")
    with wave.open(io.BytesIO(data), "rb") as audio:
        if audio.getsampwidth() != 2 or audio.getcomptype() != "NONE" or audio.getnchannels() not in (1, 2):
            raise ValueError("Expected uncompressed 16-bit WAV.")
        duration = audio.getnframes() / audio.getframerate()
        if not 0.12 <= duration <= 40:
            raise ValueError("Audio duration outside benchmark bounds.")
        raw = audio.readframes(audio.getnframes())
        if len(raw) != audio.getnframes() * audio.getnchannels() * 2:
            raise ValueError("Truncated PCM audio.")
        samples = [sample[0] / 32768 for sample in struct.iter_unpack("<h", raw)]
        if not samples:
            raise ValueError("Empty audio.")
        peak = max(abs(x) for x in samples)
        rms = math.sqrt(sum(x*x for x in samples) / len(samples))
        flags = []
        if rms < 0.0001: flags.append("silence-or-near-silence")
        if sum(abs(x) >= .999 for x in samples) / len(samples) > .01: flags.append("clipping-risk")
        return {"durationSeconds": duration, "peak": peak, "rms": rms, "flags": flags,
                "status": "technical-hold" if flags else "technical-pass", "pronunciationReviewed": False}


def credentials(provider, env):
    if provider == "gemini":
        if env.get("AUDIO_FREE_PROJECT_CONFIRMED") != "true":
            raise ValueError("Confirm an unbilled Gemini project locally: AUDIO_FREE_PROJECT_CONFIRMED=true.")
        name = "GEMINI_API_KEY"
    elif provider == "google-cloud":
        if env.get("AUDIO_ALLOW_METERED_PROJECT") != "YES":
            raise ValueError("Google Cloud requires billing. Explicit metered-project acceptance is absent; no request sent.")
        name = "GOOGLE_TTS_API_KEY"
    else:
        raise ValueError("Unknown provider.")
    if not env.get(name):
        raise ValueError(f"Configure {name} locally; never paste it into chat.")
    return env[name]


def cloud_audio(request, key):
    if request["provider"] == "google-cloud":
        endpoint = "https://texttospeech.googleapis.com/v1/text:synthesize"
        payload = {"input": {"text": request["text"]}, "voice": {"languageCode": request["locale"], "name": request["voice"]},
                   "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": 24000, "speakingRate": request["settings"]["pace"]}}
    else:
        endpoint = "https://generativelanguage.googleapis.com/v1beta/interactions"
        payload = {"model": request["model"], "store": False,
                   "input": [{"type": "user_input", "content": [{"type": "text", "text": request["text"], "annotations": [{"type": "speech_metadata", "style": request["settings"]["style"]}]}]}],
                   "response_format": {"type": "audio"},
                   "generation_config": {"speech_config": [{"voice": request["voice"]}]}}
    call = urllib.request.Request(endpoint, data=canonical(payload).encode(), headers={"content-type": "application/json", "x-goog-api-key": key})
    try:
        with urllib.request.urlopen(call, timeout=45) as response:
            raw = response.read(15 * 1024 * 1024 + 1)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Provider HTTP {error.code}; stopped without fallback or automatic retry.") from None
    except (urllib.error.URLError, TimeoutError):
        raise RuntimeError("Provider connection failed; request may have been processed. Inspect before retrying.") from None
    if len(raw) > 15 * 1024 * 1024:
        raise ValueError("Provider response exceeds the byte budget.")
    body = json.loads(raw)
    if request["provider"] == "google-cloud":
        encoded = body.get("audioContent")
    else:
        if body.get("status") != "completed":
            raise ValueError("Provider did not finish synthesis.")
        chunks = [c for step in body.get("steps", []) if step.get("type") == "model_output" for c in step.get("content", []) if c.get("type") == "audio" and c.get("data")]
        encoded = (body.get("output_audio") or {}).get("data")
        if not encoded and len(chunks) == 1:
            encoded = chunks[0]["data"]
    if not encoded:
        raise ValueError("Provider returned no single inline audio file.")
    return base64.b64decode(encoded, validate=True)


def run(plan, work=WORK, env=None, synthesize=cloud_audio, max_requests=18, character_limit=4000, month_limit=100000, seconds=300, daily_limit=10, min_interval=None):
    """Checkpoint requests before network I/O. Never retry uncertain/failed output."""
    env = local_environment() if env is None else env
    min_interval = (22 if synthesize is cloud_audio else 0) if min_interval is None else min_interval
    if not 1 <= daily_limit <= 10 or not 0 <= min_interval <= 60:
        raise ValueError("Invalid daily quota or pacing bound.")
    if not 1 <= max_requests <= 64 or not 1 <= character_limit <= 20000 or not 1 <= month_limit <= 100000:
        raise ValueError("Worker budget exceeds the permitted small-job bounds.")
    body = {k: plan[k] for k in ("schemaVersion", "kind", "provider", "scope", "tasks")}
    if digest(canonical(body).encode()) != plan["id"]:
        raise ValueError("Plan changed; create a new plan instead of editing queued requests.")
    if plan["provider"] not in ("gemini", "google-cloud") or plan["kind"] not in ("audition", "lesson-candidates") or plan["schemaVersion"] != 1:
        raise ValueError("Unsupported plan.")
    identities = set()
    for task in plan["tasks"]:
        if task["request"]["provider"] != plan["provider"] or digest(canonical(task["request"]).encode()) != task["key"] or task["key"] in identities:
            raise ValueError("Invalid or duplicate request identity.")
        identities.add(task["key"])
    key = credentials(plan["provider"], env)
    work = Path(work); work.mkdir(parents=True, exist_ok=True)
    lock = (work / "worker.lock").open("a")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        lock.close(); raise ValueError("Another audio worker is running.")
    db = sqlite3.connect(work / "registry.sqlite3")
    db.execute("CREATE TABLE IF NOT EXISTS clips (key TEXT PRIMARY KEY, status TEXT, file TEXT, sha256 TEXT, check_json TEXT)")
    db.execute("CREATE TABLE IF NOT EXISTS attempts (job TEXT, provider TEXT, month TEXT, characters INTEGER, key TEXT, created REAL)")
    db.commit()
    month = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m")
    day_start = dt.datetime.now(ZoneInfo("America/Los_Angeles")).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
    started = time.monotonic(); result = {"generated": 0, "reused": 0, "held": 0, "stopped": None}
    try:
        for task in plan["tasks"]:
            if task.get("reuseSha256"):
                result["reused"] += 1; continue
            old = db.execute("SELECT status,file,sha256 FROM clips WHERE key=?", (task["key"],)).fetchone()
            if old:
                path = work / old[1] if old[1] else None
                if old[0] == "candidate" and path and path.is_file() and digest(path.read_bytes()) == old[2]:
                    result["reused"] += 1; continue
                result["held"] += 1; continue
            used_requests, used_chars = db.execute("SELECT COUNT(*),COALESCE(SUM(characters),0) FROM attempts WHERE job=?", (plan["id"],)).fetchone()
            monthly = db.execute("SELECT COALESCE(SUM(characters),0) FROM attempts WHERE provider=? AND month=?", (plan["provider"], month)).fetchone()[0]
            daily = db.execute("SELECT COUNT(*) FROM attempts WHERE provider=? AND created>=?", (plan["provider"], day_start)).fetchone()[0]
            chars = len(task["request"]["text"]) + len(task["request"]["settings"].get("style", ""))
            if used_requests >= max_requests or used_chars + chars > character_limit or monthly + chars > month_limit or daily >= daily_limit or time.monotonic() - started > seconds:
                result["stopped"] = "budget"; break
            last = db.execute("SELECT MAX(created) FROM attempts WHERE provider=?", (plan["provider"],)).fetchone()[0]
            delay = max(0, min_interval - (time.time() - last)) if last is not None else 0
            if time.monotonic() - started + delay >= seconds:
                result["stopped"] = "budget"; break
            if delay: time.sleep(delay)
            db.execute("INSERT INTO clips(key,status) VALUES (?, 'inflight')", (task["key"],))
            db.execute("INSERT INTO attempts VALUES (?,?,?,?,?,?)", (plan["id"], plan["provider"], month, chars, task["key"], time.time()))
            db.commit()
            try:
                data = synthesize(task["request"], key)
                check = inspect_wav(data)
                sha = digest(data); file = sha + ".wav"
                (work / file).write_bytes(data)
                status = "candidate" if check["status"] == "technical-pass" else "hold"
                db.execute("UPDATE clips SET status=?,file=?,sha256=?,check_json=? WHERE key=?", (status, file, sha, canonical(check), task["key"]))
                db.commit(); result["generated"] += 1
                if status == "hold": result["held"] += 1
                save(work / (task["key"] + ".json"), {"task": task, "file": file, "sha256": sha, "technicalCheck": check, "published": False, "reviewedAt": None})
            except Exception as error:
                db.execute("UPDATE clips SET status='hold' WHERE key=?", (task["key"],)); db.commit()
                result["stopped"] = "provider-or-audio-error"
                save(work / "last-stop.json", {"task": task["key"], "reason": type(error).__name__, "manualInspectionRequired": True})
                raise
        save(work / "last-run.json", result)
        return result
    finally:
        db.close(); lock.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("setup", help="Save a Gemini key privately; no network requests")
    commands.add_parser("check-setup", help="Report configuration status without revealing the key")
    check = commands.add_parser("audit")
    check.add_argument("--output", type=Path, default=ROOT / "outputs/audio-readiness.json")
    check.add_argument("--require-ready", action="store_true")
    recovery = commands.add_parser("reconcile")
    recovery.add_argument("--apply", action="store_true")
    plan_cmd = commands.add_parser("plan")
    plan_cmd.add_argument("--provider", choices=["gemini", "google-cloud"], required=True)
    plan_cmd.add_argument("--benchmark", action="store_true")
    plan_cmd.add_argument("--lesson")
    plan_cmd.add_argument("--main-sentences", action="store_true", help="Upgrade only whole lesson sentences with accepted cloud voices")
    plan_cmd.add_argument("--limit", type=int, default=18)
    plan_cmd.add_argument("--offset", type=int, default=0)
    worker = commands.add_parser("run")
    worker.add_argument("plan", type=Path)
    worker.add_argument("--max-requests", type=int, default=18)
    worker.add_argument("--characters", type=int, default=4000)
    args = parser.parse_args()
    if args.command == "setup":
        if not sys.stdin.isatty(): raise ValueError("Run setup in Terminal; do not pass a key through chat or command arguments.")
        print("Nuevo Flow audio setup — saves locally; does not generate or publish audio.")
        print("Check Google AI Studio: this key's project must be Free tier with billing disabled.")
        confirmation = input("If confirmed, type FREE: ").strip().upper()
        if confirmation != "FREE": raise ValueError("Setup cancelled; nothing saved.")
        while True:
            api_key = getpass.getpass("Paste the Gemini API key here (hidden), then press Return: ")
            try:
                configure_free_project(api_key, confirmation)
                break
            except ValueError:
                print("No complete key received; nothing saved. Copy the key in AI Studio, then paste at the next hidden prompt. Ctrl+C cancels.")
        print("Saved privately. No API call made. You can now tell Codex: Setup complete.")
    elif args.command == "check-setup":
        env = local_environment()
        print(canonical({"keyConfigured": bool(env.get("GEMINI_API_KEY")), "freeProjectConfirmedByUser": env.get("AUDIO_FREE_PROJECT_CONFIRMED") == "true", "billingVerifiedByAPI": False, "apiRequests": 0}))
    elif args.command == "audit":
        report = audit(); save(args.output, report)
        print(canonical({k: v for k, v in report.items() if k != "lessons"}))
        if args.require_ready and not report["launchReady"]: raise SystemExit(1)
    elif args.command == "reconcile":
        manifest, _, paths, _ = existing()
        recovered = 0
        for row in manifest["clips"]:
            target = ROOT / "audio/generated/ios-download-library/assets" / row["file"]
            if row["sha256"] in paths and (not target.exists() or digest(target.read_bytes()) != row["sha256"]):
                recovered += 1
                if args.apply: shutil.copy2(paths[row["sha256"]], target)
        print(canonical({"recoverableFiles": recovered, "applied": args.apply, "generatedClips": 0}))
    elif args.command == "plan":
        if args.benchmark and args.lesson: raise ValueError("Choose benchmark or lesson, not both.")
        plan = make_plan(args.provider, args.benchmark, args.lesson, limit=args.limit, offset=args.offset, main_sentences=args.main_sentences)
        destination = WORK / "plans" / (plan["id"] + ".json"); save(destination, plan)
        print(canonical({"plan": str(destination), "requests": plan["generationRequests"], "characters": plan["estimatedCharacters"], "nextOffset": plan["nextOffset"], "generatedClips": 0}))
    elif args.command == "run":
        print(canonical(run(read(args.plan), max_requests=args.max_requests, character_limit=args.characters)))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError) as error:
        raise SystemExit(str(error))
