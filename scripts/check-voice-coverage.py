"""Check that every authored Spanish/Vietnamese prompt has the selected voices."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
inventory = json.loads((ROOT / "audio/inventory-es-vi.json").read_text(encoding="utf-8"))["items"]
clips = json.loads((ROOT / "public/audio/packs/approved.json").read_text(encoding="utf-8"))["clips"]
expected = {
    (item["language"], item["text"], voice)
    for item in inventory
    for voice in (("male", "female") if item["language"] == "es" else ("female",))
}
actual = {(clip["language"], clip["normalizedText"], clip.get("voice")) for clip in clips}
missing = sorted(expected - actual)
invalid = []
for clip in clips:
    if clip["language"] not in ("es", "vi"):
        continue
    if clip.get("voice") not in (("male", "female") if clip["language"] == "es" else ("female",)):
        invalid.append(f"Unexpected voice: {clip['id']}")
    path = ROOT / "public" / clip["url"].lstrip("/")
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != clip["sha256"]:
        invalid.append(f"Missing or changed asset: {clip['id']}")

print(f"Voice coverage: {len(expected) - len(missing)}/{len(expected)} required variants")
if missing:
    print("First missing variants:")
    for language, text, voice in missing[:20]:
        print(f"  {language}/{voice}: {text}")
if invalid:
    print("\n".join(invalid[:20]))
if missing or invalid:
    raise SystemExit(1)
