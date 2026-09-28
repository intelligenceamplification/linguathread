import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/retime-voice-pack.py"


class RetimePublication(unittest.TestCase):
    def test_requires_hash_bound_audit_and_preserves_source_review(self):
        spec = importlib.util.spec_from_file_location("retimer", SCRIPT)
        retimer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(retimer)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            retimer.ROOT = root
            source = root / "public/audio/packs/v1/source.wav"
            source.parent.mkdir(parents=True)
            source.write_bytes(b"reviewed original")
            candidate = root / "prepared/changed.m4a"
            candidate.parent.mkdir()
            candidate.write_bytes(b"pitch-preserved derivative")
            source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
            target_hash = hashlib.sha256(candidate.read_bytes()).hexdigest()
            reviewed = {"id": "one", "language": "es", "voice": "male", "text": "Hola.",
                        "normalizedText": "Hola.", "url": "/audio/packs/v1/source.wav",
                        "sha256": source_hash, "reviewedAt": "original-review"}
            pack = {"clips": [reviewed], "packVersion": "v1"}
            row = {"id": "one", "sourceSha256": source_hash, "sha256": target_hash,
                   "file": candidate.name, "normalTempo": 0.85}
            (candidate.parent / "metadata.json").write_text(json.dumps([row]))
            audit = root / "audit.jsonl"
            audit.write_text(json.dumps({**row, "status": "review"}) + "\n")
            with self.assertRaisesRegex(ValueError, "passed comparison audit"):
                retimer.apply(pack, "es", "male", "v10", candidate.parent, audit)
            retimer.apply(pack, "es", "male", "v10", candidate.parent, audit, ["one"])
            self.assertEqual(pack["clips"][0]["sha256"], source_hash)
            audit.write_text(json.dumps({**row, "status": "pass"}) + "\n")
            retimer.apply(pack, "es", "male", "v10", candidate.parent, audit)
            published = json.loads((root / "public/audio/packs/approved.json").read_text())
            self.assertEqual(published["clips"][0]["reviewedAt"], "original-review")
            self.assertEqual(published["clips"][0]["normalTempo"], 0.85)
            self.assertEqual(published["clips"][0]["tempoAdjustedFromSha256"], source_hash)
            self.assertEqual(source.read_bytes(), b"reviewed original")


if __name__ == "__main__":
    unittest.main()
