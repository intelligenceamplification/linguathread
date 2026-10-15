import importlib.util
from pathlib import Path
import unittest
import numpy as np

spec = importlib.util.spec_from_file_location("quality", Path(__file__).resolve().parents[1] / "scripts/audit-voice-audio.py")
quality = importlib.util.module_from_spec(spec); spec.loader.exec_module(quality)

class SpeechPace(unittest.TestCase):
    def test_padding_does_not_hide_fast_speech_and_internal_pauses_are_retained(self):
        rate = 16000
        tone = .1 * np.sin(2 * np.pi * 200 * np.arange(rate) / rate)
        padded = np.concatenate([np.zeros(rate * 4), tone, np.zeros(rate * 5)])
        self.assertAlmostEqual(quality.active_speech_span(padded), 1.16, places=2)
        paused = np.concatenate([tone, np.zeros(rate), tone])
        self.assertAlmostEqual(quality.active_speech_span(paused), 3.0, places=2)
        self.assertEqual(quality.active_speech_span(np.zeros(rate)), 0.0)

if __name__ == '__main__': unittest.main()
