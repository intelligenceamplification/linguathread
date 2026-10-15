import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("audio_scope", ROOT / "scripts/scope-native-audio.py")
scope = importlib.util.module_from_spec(spec); spec.loader.exec_module(scope)


class PersonalWindow(unittest.TestCase):
    def test_current_and_next_unit_follow_explicit_main_lesson_scope_without_resetting_course(self):
        inventory = json.loads((ROOT / "audio/inventory-es-vi.json").read_text())
        curriculum = json.loads((ROOT / "audio/generated/ios-approved-v1/curriculum.json").read_text())["lessons"]
        policy = json.loads((ROOT / "audio/native-personal-scope.json").read_text())
        before = copy.deepcopy(curriculum)
        result = scope.scoped_inventory(inventory, curriculum, policy)
        self.assertEqual(curriculum, before)
        self.assertEqual(len(result["scope"]["lessonIds"]), 8)
        selected = [l for l in curriculum if l["id"] in result["scope"]["lessonIds"]]
        self.assertEqual({l["unit"] for l in selected}, {17, 18})
        self.assertTrue(any(i["text"] == "Practico cada día para que las palabras salgan con naturalidad." for i in result["items"]))
        self.assertFalse(policy["includeWritingFoundations"])
        known_ids = {l['id'] for l in curriculum}
        self.assertTrue(all(any(s.split(':',1)[0] in result['scope']['lessonIds'] for s in i['sources']) for i in result['items']))
        expanded = scope.scoped_inventory(inventory, curriculum, dict(policy, includeWritingFoundations=True))
        self.assertTrue(any(any(s.startswith("vi-architecture") for s in i["sources"]) for i in expanded['items']))
        self.assertLess(len(result["items"]), len(inventory["items"]) / 5)
        saved = json.loads((ROOT / "audio/inventory-native-personal.json").read_text())
        scope.validate_scope(saved)
        saved["items"].pop()
        with self.assertRaisesRegex(ValueError, "omits required"):
            scope.validate_scope(saved)
        policy["anchorLessonId"] = "unknown-lesson"
        with self.assertRaisesRegex(ValueError, "must exist"):
            scope.scoped_inventory(inventory, curriculum, policy)


if __name__ == "__main__":
    unittest.main()
