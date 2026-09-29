import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/plan-voice-coverage.py"


class VoicePlan(unittest.TestCase):
    def test_prioritizes_missing_lesson_audio_without_rebuilding_reviewed_or_failed_clips(self):
        spec = importlib.util.spec_from_file_location("voice_plan", SCRIPT)
        planner = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(planner)
        registry = {"voices": [{"language": "es", "voice": "male", "referenceClipId": "reference", "inferenceTimesteps": 20}]}
        pack = {"clips": [
            {"id": "reference", "language": "es", "voice": "male", "normalizedText": "Hola.", "sha256": "reference-hash", "reviewedAt": "today"},
        ]}
        inventory = {"sourceLessonCount": 2, "items": [
            {"language": "es", "text": "Hola.", "sources": ["lesson-1:sentence"]},
            {"language": "es", "text": "palabra", "sources": ["lesson-1:vocabulary"]},
            {"language": "es", "text": "Frase nueva.", "sources": ["lesson-1:sentence"]},
            {"language": "es", "text": "Otra frase.", "sources": ["lesson-2:sentence"]},
        ]}
        signature = planner.generation_signature({"referenceSha256": "reference-hash", "inferenceTimesteps": 20})
        failures = [{"id": "es-male-hash", "text": "Otra frase.", "generationSignature": signature}]
        plan = planner.build_plan(inventory, registry, pack, [], failures)
        self.assertEqual(plan["report"]["expectedVariants"], 4)
        self.assertEqual(plan["report"]["publishedVariants"], 1)
        self.assertEqual([item["text"] for item in plan["items"]], ["Frase nueva.", "palabra"])
        self.assertEqual(plan["items"][0]["neededVariants"], ["male"])
        retry = planner.build_plan(inventory, registry, pack, [], failures, "retry")
        self.assertEqual([item["text"] for item in retry["items"]], ["Otra frase."])
        stale = [{"language": "es", "voice": "male", "normalizedText": "Frase nueva.",
                  "file": "old.m4a", "pipelineVersion": 4}]
        stale_plan = planner.build_plan(inventory, registry, pack, stale, failures)
        self.assertEqual(stale_plan["report"]["states"]["missing"], 2)
        current = [{**stale[0], "pipelineVersion": 6, "referenceSha256": "reference-hash",
                    "inferenceTimesteps": 20, "normalTempo": 1.0,
                    "promptMode": False, "generationSignature": signature}]
        current_plan = planner.build_plan(inventory, registry, pack, current, failures)
        self.assertEqual(current_plan["report"]["states"]["generated-unpublished"], 1)
        registry["voices"][0]["sourceReference"] = {"language": "es", "sha256": "reference-hash", "reviewedAt": "today"}
        pack["clips"][0]["sha256"] = "tempo-adjusted-hash"
        pinned_plan = planner.build_plan(inventory, registry, pack, current, failures)
        self.assertEqual(pinned_plan["report"]["states"]["generated-unpublished"], 1)


if __name__ == "__main__":
    unittest.main()
