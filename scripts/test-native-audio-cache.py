"""Exercise the actual Swift cache against a deterministic HTTP transport."""
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="nuevo-flow-cache-") as scratch:
    root = Path(scratch)
    app = root / "CacheCheck.app/Contents"
    resources = app / "Resources/NativeAudio"
    resources.mkdir(parents=True)
    binary = app / "MacOS/CacheCheck"
    binary.parent.mkdir()
    (app / "Info.plist").write_text('<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleExecutable</key><string>CacheCheck</string><key>CFBundleIdentifier</key><string>test.audio.cache</string><key>CFBundlePackageType</key><string>APPL</string></dict></plist>')
    (resources / "manifest.json").write_text(json.dumps({"releaseReady": True, "clips": [], "voicePolicies": [{"language": "es", "voice": "male", "referenceSha256": "fixture-reference", "normalTempo": .85, "backend": "fixture-backend", "recipeSha256": "fixture-recipe"}]}))
    subprocess.run(["swiftc", "-swift-version", "5", "-D", "AUDIO_CATALOG_TESTS", str(ROOT / "ios/LinguaThread/NativeAudioCatalog.swift"), str(ROOT / "tests/native-audio-cache.swift"), "-o", str(binary)], check=True)
    subprocess.run([str(binary), str(root / "cache")], check=True)
