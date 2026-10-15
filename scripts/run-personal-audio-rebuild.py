"""Build only the personal window. A complete-library rebuild is not implied."""
import json
import os
from pathlib import Path
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "audio/generated/ios-personal-v1"
PYTHON = ROOT / ".voxcpm-venv/bin/python"


def stop(signum, frame):
    raise KeyboardInterrupt("Personal rebuild stopped")


def state(stage, **details):
    (WORK / "priority-worker-state.json").write_text(json.dumps({"stage": stage, "updatedAt": time.time(), "publicationPerformed": False, "installationPerformed": False, **details}, indent=2) + "\n")


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    signal.signal(signal.SIGTERM, stop)
    stages = [
        ("personal-window", ["--inventory", "audio/inventory-native-personal.json", "--work-directory", str(WORK), "--max-cycles", "10"]),
    ]
    for name, arguments in stages:
        with (WORK / (name + ".log")).open("a") as log:
            child = subprocess.Popen([str(PYTHON), "-u", "scripts/run-native-audio-rebuild.py", "--batch-size", "100", *arguments], cwd=ROOT, env=dict(os.environ, HF_HUB_OFFLINE="1", PYTORCH_ENABLE_MPS_FALLBACK="1"), stdout=log, stderr=subprocess.STDOUT)
            state(name, childPid=child.pid)
            try:
                result = child.wait()
            except BaseException:
                child.terminate(); child.wait()
                state("stopped", scope=name)
                raise
            if result:
                state("failed", scope=name, exitCode=result)
                raise RuntimeError(f"{name} exited {result}")
            coverage_path = (WORK if name == "personal-window" else ROOT / "audio/generated/ios-approved-v1") / "coverage.json"
            coverage = json.loads(coverage_path.read_text())
            if not coverage["releaseReady"]:
                state("remaining-clips-require-repair-or-listening-review", scope=name, verifiedVariants=coverage["verifiedVariants"], expectedVariants=coverage["expectedVariants"])
                return
    state("generation-finished-check-coverage-and-held-clips")


if __name__ == "__main__":
    main()
