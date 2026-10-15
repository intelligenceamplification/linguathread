"""Generate and screen a bounded Spanish batch; never publishes or installs."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "audio/generated/ios-approved-v1"
TAKES = ROOT / "audio/generated/ios-spanish-v1"
PYTHON = ROOT / ".voxcpm-venv/bin/python"
SPANISH_PYTHON = ROOT / ".chatterbox-venv/bin/python"
REVIEWS = ROOT / "audio/listening-reviews-ios-v1.json"
spec = importlib.util.spec_from_file_location("priority", ROOT / "scripts/native-audio-priority.py")
priority = importlib.util.module_from_spec(spec)
spec.loader.exec_module(priority)


def state(stage, **details):
    WORK.mkdir(parents=True, exist_ok=True)
    (WORK / "spanish-worker-state.json").write_text(json.dumps(dict(stage=stage, updatedAt=time.time(), publicationPerformed=False, **details), indent=2) + "\n")


def stop(signum, frame):
    raise KeyboardInterrupt("Spanish batch stopped")


def scoped_failures(attempted, passed, queue_keys):
    return (attempted & queue_keys) - passed


def run(name, python, arguments):
    state(name)
    with (WORK / (name + ".log")).open("w") as log:
        process = subprocess.Popen([str(python), *arguments], cwd=ROOT, env=dict(os.environ, HF_HUB_OFFLINE="1", PYTORCH_ENABLE_MPS_FALLBACK="1"), stdout=log, stderr=subprocess.STDOUT)
        state(name, childPid=process.pid)
        try:
            code = process.wait()
        except BaseException:
            process.terminate()
            process.wait()
            state("stopped")
            raise
        if code:
            raise RuntimeError(f"{name} exited {code}")


def main():
    global WORK
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=30)
    parser.add_argument("--inventory", type=Path, default=ROOT / "audio/inventory-es-vi.json")
    parser.add_argument("--work-directory", type=Path, default=WORK)
    args = parser.parse_args()
    WORK = args.work_directory.resolve()
    WORK.mkdir(parents=True, exist_ok=True)
    signal.signal(signal.SIGTERM, stop)
    # An interrupted synthesis batch may have complete files awaiting its audit.
    existing = TAKES / "metadata.jsonl"
    if existing.exists():
        saved = [json.loads(line) for line in existing.read_text().splitlines()]
        if any(r.get("qualityCheck", {}).get("auditVersion") != 2 for r in saved):
            run("spanish-resume-screen", PYTHON, ["scripts/audit-voice-audio.py", "--metadata", str(existing), "--output", str(TAKES / "audit.jsonl")])
            checks = {r["sha256"]: r for r in map(json.loads, (TAKES / "audit.jsonl").read_text().splitlines())}
            for row in saved:
                row["qualityCheck"] = checks[row["sha256"]]
            existing.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in saved))
    build = ["scripts/build-native-audio-pack.py", "--inventory", str(args.inventory.resolve()), "--output", str(WORK), "--audit", str(ROOT / "audio/generated/ios-approved-v1/audit.jsonl"), "--listening-review", str(REVIEWS)]
    run("spanish-plan", PYTHON, build)
    missing = json.loads((WORK / "missing.json").read_text())["items"]
    pending = [row for row in missing if row["language"] == "es"]
    inventory = json.loads(args.inventory.read_text())
    if not inventory.get("scope"):
        inventory["priorityAnchorLessonId"] = json.loads((ROOT / "audio/native-personal-scope.json").read_text())["anchorLessonId"]
    lessons = json.loads((ROOT / "audio/generated/ios-approved-v1/curriculum.json").read_text())["lessons"]
    queue = priority.prioritize(pending, inventory, lessons)
    plan = WORK / "spanish-batch-plan.json"
    queue_keys = {(row["text"], voice) for row in queue for voice in row["neededVariants"]}
    plan.write_text(json.dumps({"items": queue}, ensure_ascii=False, indent=2) + "\n")
    ffmpeg = subprocess.check_output([str(PYTHON), "-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"], text=True).strip()
    for attempt in range(1, 4):
        run(f"spanish-generate-{attempt}", SPANISH_PYTHON, ["scripts/generate-native-spanish.py", "--inventory", str(plan), "--output", str(TAKES), "--limit", str(args.limit), "--attempt", str(attempt), "--ffmpeg", ffmpeg])
        if not (TAKES / "metadata.jsonl").exists():
            raise RuntimeError("Spanish generation produced no candidates")
        audit = TAKES / "audit.jsonl"
        run(f"spanish-screen-{attempt}", PYTHON, ["scripts/audit-voice-audio.py", "--metadata", str(TAKES / "metadata.jsonl"), "--output", str(audit)])
        checks = {r["sha256"]: r for r in map(json.loads, audit.read_text().splitlines())}
        rows = [json.loads(line) for line in (TAKES / "metadata.jsonl").read_text().splitlines()]
        for row in rows:
            row["qualityCheck"] = checks[row["sha256"]]
        (TAKES / "metadata.jsonl").write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows))
        run(f"spanish-remaster-{attempt}", PYTHON, ["scripts/remaster-native-pace.py", "--metadata", str(TAKES / "metadata.jsonl"), "--ffmpeg", ffmpeg])
        run(f"spanish-rescreen-{attempt}", PYTHON, ["scripts/audit-voice-audio.py", "--metadata", str(TAKES / "metadata.jsonl"), "--output", str(audit)])
        checks = {r["sha256"]: r for r in map(json.loads, audit.read_text().splitlines())}
        rows = [json.loads(line) for line in (TAKES / "metadata.jsonl").read_text().splitlines()]
        for row in rows:
            row["qualityCheck"] = checks[row["sha256"]]
        (TAKES / "metadata.jsonl").write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows))
        accepted = {r["sha256"] for r in json.loads(REVIEWS.read_text())["reviews"] if r.get("approved") is True}
        passed = {(r["sourceText"], r["voice"]) for r in rows if r["qualityCheck"]["status"] == "automated-pass" or r["sha256"] in accepted}
        attempted = {(r["sourceText"], r["voice"]) for r in rows if r["attempt"] == attempt}
        if (TAKES / "failed.jsonl").exists():
            attempted.update((r["text"], r["voice"]) for r in map(json.loads, (TAKES / "failed.jsonl").read_text().splitlines()) if r["attempt"] == attempt)
        # Shared metadata also contains takes from other lesson windows.
        # They must not enter this scoped batch's retry queue.
        failed = scoped_failures(attempted, passed, queue_keys)
        if not failed:
            break
        lookup = {r["text"]: r for r in queue}
        retry = [dict(lookup[text], neededVariants=[v for t, v in failed if t == text]) for text in sorted({t for t, v in failed})]
        retry = priority.prioritize(retry, inventory, lessons)
        plan.write_text(json.dumps({"items": retry}, ensure_ascii=False, indent=2) + "\n")
    run("spanish-coverage", PYTHON, build)
    report = json.loads((WORK / "coverage.json").read_text())
    coverage = {k: v for k, v in report.items() if k != "rejectedCandidates"}
    coverage["rejectedCandidateCount"] = len(report.get("rejectedCandidates", []))
    state("batch-complete", coverage=coverage, remainingFlaggedVariants=len(failed))
    print(json.dumps({"coverage": coverage, "remainingFlaggedVariants": len(failed)}), flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        state("failed", error=str(error))
        raise
