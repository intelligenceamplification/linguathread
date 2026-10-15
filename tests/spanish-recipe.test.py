"""Ensure pace upgrades reuse synthesis without mixing voices or target words."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("spanish", ROOT / "scripts/generate-native-spanish.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RecipeCache(unittest.TestCase):
    def test_render_changes_reuse_source_but_language_content_changes_do_not(self):
        recipe = json.loads((ROOT / "audio/spanish-recipe-v1.json").read_text())
        voice = recipe["voices"][0]
        first = module.generation_key(recipe, "eres", voice, 1)
        altered = copy.deepcopy(recipe)
        altered["voices"][0]["normalTempo"] = .8
        altered["postGain"] = .9
        self.assertEqual(first, module.generation_key(altered, "eres", altered["voices"][0], 1))
        self.assertNotEqual(first, module.generation_key(recipe, "de", voice, 1))
        self.assertNotEqual(first, module.generation_key(recipe, "eres", recipe["voices"][1], 1))
        self.assertNotEqual(first, module.generation_key(recipe, "eres", voice, 2))
        self.assertNotEqual(first, module.generation_key(recipe, "eres", voice, 1, text_preparation_version=2))
        self.assertNotEqual(first, module.generation_key(recipe, "eres", voice, 1, pronunciation="éres."))
        altered["temperature"] = .7
        self.assertNotEqual(first, module.generation_key(altered, "eres", altered["voices"][0], 1))


if __name__ == "__main__":
    unittest.main()
