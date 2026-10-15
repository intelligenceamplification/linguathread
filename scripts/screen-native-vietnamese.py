"""Screen final audio after synthesis exits; keep models out of RAM together."""
import argparse
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--work-directory', type=Path, default=ROOT / 'audio/generated/ios-vietnamese-v1')
args = parser.parse_args()
WORK = args.work_directory.resolve()
import importlib.util
spec = importlib.util.spec_from_file_location('native_vietnamese_audit', ROOT / 'scripts/audit-native-vietnamese.py')
reference_audit = importlib.util.module_from_spec(spec); spec.loader.exec_module(reference_audit)
RECOGNIZER_ID = reference_audit.MODEL_ID
metadata = WORK / "metadata.jsonl"
if not metadata.exists():
    raise SystemExit(0)
rows = [json.loads(line) for line in metadata.read_text().splitlines()]
audit = WORK / "audit.jsonl"
subprocess.run([str(ROOT / ".voxcpm-venv/bin/python"), "scripts/audit-native-vietnamese.py", "--metadata", str(metadata), "--output", str(audit)], cwd=ROOT, check=True)
checked = {row["sha256"]: row for row in map(json.loads, audit.read_text().splitlines()) if row.get("auditVersion") == 2 and row.get("model") == RECOGNIZER_ID}
failure_path = WORK / "failed.jsonl"
failures = [json.loads(line) for line in failure_path.read_text().splitlines()] if failure_path.exists() else []
failed_keys = {(row["id"], row.get("generationSignature")) for row in failures}
for row in rows:
    row["qualityCheck"] = checked[row["sha256"]]
    key = row["id"], row["generationSignature"]
    if row["qualityCheck"]["status"] != "automated-pass" and key not in failed_keys:
        failures.append({"id": row["id"], "language": "vi", "voice": row["voice"], "text": row["sourceText"], "generationSignature": row["generationSignature"], "error": row["qualityCheck"]["flags"]})
        failed_keys.add(key)
metadata.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows))
failure_path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in failures))
