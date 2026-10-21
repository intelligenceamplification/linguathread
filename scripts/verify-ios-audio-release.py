"""Refuse stale native wrappers before an in-place iPhone refresh."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import plistlib
import re

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = 2


def verify_source(root=ROOT):
    view = (root / "ios/LinguaThread/ContentView.swift").read_text()
    project = (root / "ios/LinguaThread.xcodeproj/project.pbxproj").read_text()
    if "__LINGUATHREAD_NATIVE_AUDIO_VERSION__ = 2" not in view or 'action == "setRate"' not in view:
        raise ValueError("Stale iOS player: approved catalog and live Normal/Slow support are required.")
    if "NativeAudioCatalog.swift in Sources" not in project or "NativeAudio in Resources" not in project:
        raise ValueError("iOS project omits the approved audio implementation or seed.")
    with (root / "ios/LinguaThread/Info.plist").open("rb") as handle:
        info = plistlib.load(handle)
    if info.get("NuevoFlowAudioContractVersion") != CONTRACT or project.count("INFOPLIST_FILE = LinguaThread/Info.plist;") != 2:
        raise ValueError("Missing audio release contract in Debug/Release.")
    if any(int(value) < 12 for value in re.findall(r"CURRENT_PROJECT_VERSION = (\d+);", project)):
        raise ValueError("Refusing a build older than the audio rollback repair.")
    spec = importlib.util.spec_from_file_location("audio_release_gate", root / "scripts/verify-native-audio-pack.py")
    gate = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gate)
    directory = root / "ios/LinguaThread/NativeAudio"
    pack = json.loads((directory / "manifest.json").read_text())
    inventory = pack.get("inventoryPath")
    if inventory not in ("audio/inventory-native-personal.json", "audio/inventory-es-vi.json"):
        raise ValueError("Unsupported native inventory.")
    return gate.verify(directory, root / inventory, root / "audio/voice-registry.json", root / "audio/known-audio-defects.json")


def verify_app(app, root=ROOT):
    with (app / "Info.plist").open("rb") as handle:
        info = plistlib.load(handle)
    if info.get("CFBundleIdentifier") != "com.desmondwood.linguathread":
        raise ValueError("Unexpected iPhone app identity.")
    if int(info.get("NuevoFlowAudioContractVersion", 0)) != CONTRACT or int(info.get("CFBundleVersion", 0)) < 12:
        raise ValueError("Refusing to install the old fixed-speed/system-voice wrapper.")
    seed = root / "ios/LinguaThread/NativeAudio/manifest.json"
    installed = app / "NativeAudio/manifest.json"
    if installed.read_bytes() != seed.read_bytes():
        raise ValueError("Built audio seed differs from the approved source.")
    clips = json.loads(installed.read_text())["clips"]
    for clip in clips:
        if Path(clip["file"]).name != clip["file"]:
            raise ValueError("Unsafe audio filename.")
        if hashlib.sha256((app / "NativeAudio" / clip["file"]).read_bytes()).hexdigest() != clip["sha256"]:
            raise ValueError("Built audio is missing or differs from its approved hash.")
    return len(clips)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", type=Path, help="Also verify the built .app before installing")
    args = parser.parse_args()
    try:
        count = verify_source()
        if args.app:
            count = verify_app(args.app)
        print(f"Audio contract {CONTRACT} verified: {count} approved-source variants; no audio generated.")
    except (ValueError, OSError, KeyError) as error:
        raise SystemExit(str(error))
