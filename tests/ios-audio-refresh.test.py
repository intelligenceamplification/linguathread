import hashlib
import importlib.util
import json
from pathlib import Path
import plistlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("ios_refresh_gate", Path(__file__).resolve().parents[1] / "scripts/verify-ios-audio-release.py")
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class RefreshGate(unittest.TestCase):
    def test_old_wrapper_source_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "ios/LinguaThread").mkdir(parents=True)
            (root / "ios/LinguaThread.xcodeproj").mkdir()
            (root / "ios/LinguaThread/ContentView.swift").write_text('utterance.rate = 0.46')
            (root / "ios/LinguaThread.xcodeproj/project.pbxproj").write_text('CURRENT_PROJECT_VERSION = 1;')
            with self.assertRaisesRegex(ValueError, "Stale iOS player"):
                gate.verify_source(root)

    def test_install_gate_rejects_old_wrapper_wrong_identity_or_missing_audio(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            app = root / "Nuevo.app"
            seed = root / "ios/LinguaThread/NativeAudio"
            seed.mkdir(parents=True)
            (app / "NativeAudio").mkdir(parents=True)
            data = b'unchanged approved recording'
            digest = hashlib.sha256(data).hexdigest()
            manifest = json.dumps({"clips": [{"file": digest + ".m4a", "sha256": digest}]}).encode()
            (seed / "manifest.json").write_bytes(manifest)
            (app / "NativeAudio/manifest.json").write_bytes(manifest)
            media = app / "NativeAudio" / (digest + ".m4a")
            media.write_bytes(data)
            info = {"CFBundleIdentifier": "com.desmondwood.linguathread", "CFBundleVersion": "11", "NuevoFlowAudioContractVersion": 2}

            def check():
                (app / "Info.plist").write_bytes(plistlib.dumps(info))
                return gate.verify_app(app, root)

            self.assertEqual(check(), 1)
            info.pop("NuevoFlowAudioContractVersion")
            with self.assertRaisesRegex(ValueError, "old fixed-speed"):
                check()
            info["NuevoFlowAudioContractVersion"] = 2
            info["CFBundleVersion"] = "1"
            with self.assertRaisesRegex(ValueError, "old fixed-speed"):
                check()
            info["CFBundleVersion"] = "11"
            info["CFBundleIdentifier"] = "wrong.app"
            with self.assertRaisesRegex(ValueError, "identity"):
                check()
            info["CFBundleIdentifier"] = "com.desmondwood.linguathread"
            media.write_bytes(b'old voice file')
            with self.assertRaisesRegex(ValueError, "approved hash"):
                check()


if __name__ == "__main__":
    unittest.main()
