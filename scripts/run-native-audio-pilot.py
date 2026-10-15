"""One bounded local pilot. No deployment and no device installation."""
import json
import os
import subprocess
import signal
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "audio/generated/ios-approved-v1"
PYTHON = ROOT / ".voxcpm-venv/bin/python"
env = dict(os.environ, HF_HUB_OFFLINE="1", TQDM_DISABLE="1")
def stop(signum, frame):
    raise KeyboardInterrupt("Local audio pilot stopped")
signal.signal(signal.SIGTERM, stop)

def state(stage, **details):
    (WORK / "worker-state.json").write_text(json.dumps(dict(stage=stage, updatedAt=time.time(), **details), indent=2))

def run(name, arguments):
    state(name)
    with (WORK / (name + ".log")).open("w") as log:
        process = subprocess.Popen([str(PYTHON), *arguments], cwd=ROOT, env=env, stdout=log, stderr=subprocess.STDOUT)
        state(name, childPid=process.pid)
        try:
            code = process.wait()
        except BaseException:
            process.terminate()
            process.wait()
            state("stopped", publicationPerformed=False)
            raise
        if code:
            raise RuntimeError(f"{name} exited {code}")

try:
    run("prepare", ["scripts/build-native-audio-pack.py", "--listening-review", "audio/listening-reviews-ios-v1.json"])
    missing = json.loads((WORK / "missing.json").read_text())["items"]
    lookup = {(row["language"], row["text"]): row for row in missing}
    inventory = json.loads((ROOT / "audio/inventory-es-vi.json").read_text())["items"]
    # Start with reported phonetics, then full authored utterances in course order.
    reported = json.loads((ROOT / "audio/known-audio-defects.json").read_text())["defects"]
    keys = {(row["language"], row["text"]) for row in reported if row.get("requiresPronunciationReview")}
    source_rank = lambda row: 0 if (row["language"], row["text"]) in keys else 1 if any(source.rsplit(":", 1)[-1] in ("sentence", "transform", "mastery", "bridge-mastery") for source in row["sources"]) else 2
    queue = [dict(row, neededVariants=lookup[(row["language"], row["text"])]["neededVariants"]) for row in sorted(inventory, key=source_rank) if (row["language"], row["text"]) in lookup]
    for language in ("es", "vi"):
        if language == "es":
            run("generate-es", ["scripts/run-native-spanish-batch.py", "--limit", "30"])
            continue
        path = WORK / f"pilot-{language}.json"
        path.write_text(json.dumps({"items": [row for row in queue if row["language"] == language]}, ensure_ascii=False, indent=2))
        run(f"generate-{language}", ["scripts/generate-approved-voice-coverage.py", "--inventory", str(path), "--output", "audio/generated/ios-overhaul-takes", "--language", language, "--limit", "30", "--isolated", "--defer-failed", "--device", "mps"])
    run("coverage", ["scripts/build-native-audio-pack.py", "--listening-review", "audio/listening-reviews-ios-v1.json"])
    state("pilot-finished-awaiting-quality-review", publicationPerformed=False)
except Exception as error:
    state("failed", error=str(error), publicationPerformed=False)
    raise
