"""Immediate local rebuild, in resumable bounded batches. No scheduling/release."""
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
PYTHON = ROOT / ".voxcpm-venv/bin/python"
REVIEWS = ROOT / "audio/listening-reviews-ios-v1.json"
spec = importlib.util.spec_from_file_location("priority", ROOT / "scripts/native-audio-priority.py")
priority = importlib.util.module_from_spec(spec)
spec.loader.exec_module(priority)


def coverage():
    report = json.loads((WORK / "coverage.json").read_text())
    return {k: v for k, v in report.items() if k != "rejectedCandidates"}


def state(stage, **details):
    (WORK / "full-rebuild-state.json").write_text(json.dumps(dict(stage=stage, updatedAt=time.time(), publicationPerformed=False, installationPerformed=False, **details), indent=2) + "\n")


def stop(signum, frame):
    raise KeyboardInterrupt("Local rebuild stopped")


def run(name, arguments, runtime=PYTHON, extra_env=None):
    with (WORK / (name + ".log")).open("w") as log:
        child = subprocess.Popen([str(runtime), *arguments], cwd=ROOT, env=dict(os.environ, HF_HUB_OFFLINE="1", PYTORCH_ENABLE_MPS_FALLBACK="1", **(extra_env or {})), stdout=log, stderr=subprocess.STDOUT)
        state(name, childPid=child.pid, coverage=coverage())
        try:
            result = child.wait()
        except BaseException:
            child.terminate()
            child.wait()
            state("stopped", coverage=coverage())
            raise
        if result:
            raise RuntimeError(f"{name} failed: {result}")


def main():
    global WORK
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--max-cycles", type=int, default=40)
    parser.add_argument("--inventory", type=Path, default=ROOT / "audio/inventory-es-vi.json")
    parser.add_argument("--work-directory", type=Path, default=WORK)
    args = parser.parse_args()
    inventory = json.loads(args.inventory.read_text())
    if not inventory.get("scope"):
        inventory["priorityAnchorLessonId"] = json.loads((ROOT / "audio/native-personal-scope.json").read_text())["anchorLessonId"]
    lessons = json.loads((ROOT / "audio/generated/ios-approved-v1/curriculum.json").read_text())["lessons"]
    WORK = args.work_directory.resolve()
    if args.batch_size < 1 or args.max_cycles < 1:
        parser.error("Positive batch/cycle bounds are required")
    WORK.mkdir(parents=True, exist_ok=True)
    signal.signal(signal.SIGTERM, stop)
    build = ["scripts/build-native-audio-pack.py", "--inventory", str(args.inventory.resolve()), "--output", str(WORK), "--audit", str(ROOT / "audio/generated/ios-approved-v1/audit.jsonl"), "--listening-review", str(REVIEWS), "--export-library", str(ROOT / "audio/generated/ios-download-library")]
    run("rebuild-plan", build)
    for cycle in range(1, args.max_cycles + 1):
        before = coverage()["verifiedVariants"]
        if coverage()["releaseReady"]:
            state("coverage-ready-awaiting-release-verification", coverage=coverage())
            return
        missing = json.loads((WORK / "missing.json").read_text())["items"]
        if any(r["language"] == "es" for r in missing):
            run(f"cycle-{cycle}-spanish", ["scripts/run-native-spanish-batch.py", "--limit", str(args.batch_size), "--inventory", str(args.inventory.resolve()), "--work-directory", str(WORK)])
        missing = json.loads((WORK / "missing.json").read_text())["items"]
        vietnamese = priority.prioritize([r for r in missing if r["language"] == "vi"], inventory, lessons)
        if vietnamese:
            plan = WORK / "vietnamese-rebuild-plan.json"
            plan.write_text(json.dumps({"items": vietnamese}, ensure_ascii=False, indent=2) + "\n")
            run(f"cycle-{cycle}-vietnamese", ["scripts/generate-native-vietnamese.py", "--inventory", str(plan), "--output", "audio/generated/ios-vieneu-v1", "--limit", str(args.batch_size)], runtime=ROOT / ".vieneu-venv/bin/python", extra_env={"HF_HUB_CACHE": str(ROOT / "audio/models/vieneu-hf-cache")})
            run(f"cycle-{cycle}-vietnamese-screen", ["scripts/screen-native-vietnamese.py", "--work-directory", "audio/generated/ios-vieneu-v1"])
            run(f"cycle-{cycle}-coverage", build)
        after = coverage()
        state("cycle-complete", cycle=cycle, coverage=after)
        if after["verifiedVariants"] <= before:
            state("remaining-clips-require-repair-or-listening-review", coverage=after)
            return
    state("batch-bound-reached", coverage=coverage())


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        state("failed", error=str(error))
        raise
