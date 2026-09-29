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
AUDITOR = Path(__file__).resolve().parents[1] / "scripts/audit-voice-audio.py"
QUARANTINE = Path(__file__).resolve().parents[1] / "scripts/quarantine-voice-clips.py"
ROOT = Path(__file__).resolve().parents[1]


class PublishedSpanishPace(unittest.TestCase):
    def test_every_selectable_spanish_male_clip_has_approved_normal_pace(self):
        pack = json.loads((ROOT / "public/audio/packs/approved.json").read_text(encoding="utf-8"))
        clips = [clip for clip in pack["clips"] if clip["language"] == "es" and clip.get("voice") == "male"]
        self.assertGreater(len(clips), 100)
        self.assertTrue(all(clip.get("normalTempo") == 0.85 for clip in clips))
        self.assertFalse(any(clip["id"] == "es-male-1883076d1b0c384f" for clip in clips))
        self.assertTrue(any(clip["normalizedText"] == "Ya sé explicar" and clip.get("voice") == "female"
                            for clip in pack["clips"]))


class AlternativeSpeech(unittest.TestCase):
    def test_alternatives_are_separate_synthesis_inputs(self):
        spec = importlib.util.spec_from_file_location("generator", ROOT / "scripts/generate-approved-voice-coverage.py")
        generator = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(generator)
        self.assertEqual(generator.speech_segments("vi", "từ / của"), ["từ", "của"])
        self.assertEqual(generator.speech_segments("vi", "Mình ／ Tôi"), ["Mình", "Tôi"])
        self.assertEqual(generator.speech_segments("es", "sí"), ["sí"])


class TranscriptionNormalization(unittest.TestCase):
    def test_spoken_digit_equivalence_preserves_diacritic_distinctions(self):
        spec = importlib.util.spec_from_file_location("auditor", AUDITOR)
        auditor = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(auditor)
        self.assertEqual(auditor.normalize("1 món", "vi"), auditor.normalize("một món", "vi"))
        self.assertEqual(auditor.normalize("20 años", "es"), auditor.normalize("veinte años", "es"))
        self.assertNotEqual(auditor.normalize("má", "vi"), auditor.normalize("ma", "vi"))
        self.assertNotEqual(auditor.normalize("sí", "es"), auditor.normalize("si", "es"))

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
            (root / "audio").mkdir()
            (root / "audio/known-audio-defects.json").write_text(json.dumps({"defects": [{"sha256": candidates[3]["sha256"], "status": "blocked"}]}))
            previous = sys.argv
            try:
                sys.argv = [str(SCRIPT), str(metadata), "--audit", str(report), "--version", "test", "--replace"]
                with self.assertRaisesRegex(ValueError, "Known defective audio"):
                    with contextlib.redirect_stdout(io.StringIO()):
                        packager.main()
            finally:
                sys.argv = previous

            (root / "audio/known-audio-defects.json").write_text(json.dumps({"defects": [{"sha256": "older-rejected-file", "status": "blocked", "language": "es", "text": "clear", "voice": "male", "requiresPronunciationReview": True}]}))
            previous = sys.argv
            try:
                sys.argv = [str(SCRIPT), str(metadata), "--audit", str(report), "--version", "test", "--replace"]
                with self.assertRaisesRegex(ValueError, "requires listening review"):
                    with contextlib.redirect_stdout(io.StringIO()):
                        packager.main()
                review = root / "human-review.json"
                review.write_text(json.dumps({"reviews": [{"sha256": candidates[3]["sha256"], "language": "es", "text": "clear", "voice": "male", "approved": True, "reviewedAt": "human-review-time", "reviewedBy": "reviewer", "evidence": "explicit listening approval fixture"}]}))
                sys.argv += ["--listening-review", str(review)]
                with contextlib.redirect_stdout(io.StringIO()):
                    packager.main()
                repaired = next(c for c in json.loads(manifest.read_text())["clips"] if c["id"] == "3")
                self.assertEqual(repaired["reviewedAt"], "human-review-time")
            finally:
                sys.argv = previous

            self.assertEqual(clips[0]["sha256"], "protected")
            self.assertNotIn("reviewedAt", clips[1])


class QuarantineGate(unittest.TestCase):
    def test_requires_same_text_audio_before_removing_a_bad_take(self):
        spec = importlib.util.spec_from_file_location("quarantine", QUARANTINE)
        quarantine = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(quarantine)
        with tempfile.TemporaryDirectory() as directory:
            quarantine.ROOT = Path(directory)
            female = Path(directory) / "public/female.m4a"
            female.parent.mkdir(parents=True)
            female.write_bytes(b"clear alternate")
            male_clip = {"id": "bad-male", "language": "es", "voice": "male", "normalizedText": "Ya sé explicar"}
            female_clip = {"id": "female", "language": "es", "voice": "female",
                           "normalizedText": "Ya sé explicar", "url": "/female.m4a",
                           "sha256": hashlib.sha256(female.read_bytes()).hexdigest()}
            pack = {"clips": [male_clip]}
            with self.assertRaisesRegex(ValueError, "No exact-text alternate"):
                quarantine.quarantine(pack, ["bad-male"])
            pack["clips"].append(female_clip)
            removed = quarantine.quarantine(pack, ["bad-male"])
            self.assertEqual([clip["id"] for clip in removed], ["bad-male"])
            self.assertEqual([clip["id"] for clip in pack["clips"]], ["female"])

if __name__ == "__main__":
    unittest.main()
