import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/package-voice-coverage.py"

class PublicationGate(unittest.TestCase):
    def test_failed_or_changed_recordings_cannot_replace_reviewed_audio(self):
        spec = importlib.util.spec_from_file_location("packager", SCRIPT)
        packager = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(packager)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            packager.ROOT = root
            manifest = root / "public/audio/packs/approved.json"
            manifest.parent.mkdir(parents=True)
            protected = {"id": "reviewed", "language": "es", "normalizedText": "Soy de Indiana.", "voice": "male", "sha256": "protected", "reviewedAt": "2026-09-23"}
            manifest.write_text(json.dumps({"clips": [protected]}))
            candidates = []
            audit = []
            for index, (text, status, errors) in enumerate([(protected["normalizedText"], "automated-pass", 0), ("mismatch", "automated-pass", 1), ("too fast", "needs-review", 0), ("clear", "automated-pass", 0)]):
                file = root / f"{index}.m4a"
                file.write_bytes(f"fixture {index}".encode())
                digest = hashlib.sha256(file.read_bytes()).hexdigest()
                candidates.append({"id": str(index), "language": "es", "sourceText": text, "normalizedText": text, "voice": "male", "file": file.name, "sha256": digest})
                audit.append({"sha256": digest, "status": status, "wordErrorRate": errors, "characterErrorRate": errors})
            metadata = root / "metadata.jsonl"
            report = root / "audit.jsonl"
            metadata.write_text("\n".join(map(json.dumps, candidates)))
            report.write_text("\n".join(map(json.dumps, audit)))
            previous = sys.argv
            try:
                sys.argv = [str(SCRIPT), str(metadata), "--audit", str(report), "--version", "test", "--replace"]
                with contextlib.redirect_stdout(io.StringIO()):
                    packager.main()
            finally:
                sys.argv = previous
            clips = json.loads(manifest.read_text())["clips"]
            self.assertEqual([clip["id"] for clip in clips], ["reviewed", "3"])
            self.assertEqual(clips[0]["sha256"], "protected")
            self.assertNotIn("reviewedAt", clips[1])

if __name__ == "__main__":
    unittest.main()
