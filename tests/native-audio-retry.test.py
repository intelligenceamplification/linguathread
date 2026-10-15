import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("batch", ROOT / "scripts/run-native-spanish-batch.py")
batch = importlib.util.module_from_spec(spec); spec.loader.exec_module(batch)
spec = importlib.util.spec_from_file_location("generator", ROOT / "scripts/generate-approved-voice-coverage.py")
generator = importlib.util.module_from_spec(spec); spec.loader.exec_module(generator)


class RetryScope(unittest.TestCase):
    def test_content_attempts_are_distinct_and_keep_original_first_take(self):
        identity = '12345678abcdef00'
        self.assertEqual(generator.candidate_seed(identity, 1, 0), int('12345678', 16))
        seeds = {generator.candidate_seed(identity, candidate, signal) for candidate in (1, 2, 3) for signal in range(3)}
        self.assertEqual(len(seeds), 9)
    def test_context_retry_is_bounded_to_previously_failed_reference_takes(self):
        failures = {('clip', 'reference')}
        self.assertTrue(generator.pending_context_retry(failures, 'clip', 'reference', 'context'))
        self.assertFalse(generator.pending_context_retry(failures, 'new-clip', 'reference', 'context'))
        failures.add(('clip', 'context'))
        self.assertFalse(generator.pending_context_retry(failures, 'clip', 'reference', 'context'))
    def test_upcoming_lesson_audio_precedes_foundations_without_dropping_items(self):
        lessons = [{'id': 'old'}, {'id': 'current'}, {'id': 'next'}]
        items = [{'language': 'es', 'text': 'a', 'sources': ['es-alphabet:example']}, {'language': 'es', 'text': 'next phrase', 'sources': ['next:sentence']}, {'language': 'es', 'text': 'current phrase', 'sources': ['current:sentence']}]
        inventory = {'scope': {'anchorLessonId': 'current'}, 'items': items}
        ordered = batch.priority.prioritize(items, inventory, lessons)
        self.assertEqual([i['text'] for i in ordered], ['current phrase', 'next phrase', 'a'])
        self.assertEqual(len(ordered), len(items))

    def test_shared_metadata_cannot_retry_an_unrelated_lesson(self):
        current = ("Practico cada día para que las palabras salgan con naturalidad.", "female")
        unrelated = ("Agradezco la confianza; sin embargo, no estaría en condiciones de asumir esa responsabilidad ahora.", "female")
        self.assertEqual(batch.scoped_failures({current, unrelated}, set(), {current}), {current})
        self.assertEqual(batch.scoped_failures({current, unrelated}, {current}, {current}), set())


if __name__ == "__main__":
    unittest.main()
