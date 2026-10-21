"""No keys, models, or network required: test actual persistence and safety gates."""
import copy
import base64
import fcntl
import importlib.util
import io
import json
import math
from pathlib import Path
import sqlite3
import struct
import tempfile
import unittest
from unittest.mock import patch
import wave

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("pipeline", ROOT / "scripts/audio_pipeline.py")
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
ENV = {"AUDIO_FREE_PROJECT_CONFIRMED": "true", "GEMINI_API_KEY": "test-not-a-real-key"}


def wav(silent=False, clipped=False):
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1); audio.setsampwidth(2); audio.setframerate(24000)
        audio.writeframes(b"".join(struct.pack("<h", 0 if silent else 32767 if clipped else int(5000 * math.sin(i / 8))) for i in range(4800)))
    return output.getvalue()


def plan(texts=("eres", "de"), provider="gemini"):
    tasks = []
    for text in texts:
        request = {"provider": provider, "model": "test", "voice": "test", "locale": "es-ES", "text": text, "settings": {}, "normalizerVersion": 1}
        tasks.append({"key": p.digest(p.canonical(request).encode()), "request": request, "reuseSha256": None})
    body = {"schemaVersion": 1, "kind": "audition", "provider": provider, "scope": "test", "tasks": tasks}
    return dict(body, id=p.digest(p.canonical(body).encode()))


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.work = Path(self.temp.name)
        self.calls = []

    def tearDown(self):
        self.temp.cleanup()

    def synth(self, request, key):
        self.calls.append(request); return wav()

    def run_job(self, job=None, **kwargs):
        return p.run(job or plan(), work=self.work, env=ENV, synthesize=self.synth, **kwargs)

    def test_replay_and_new_job_reuse_completed_content(self):
        self.assertEqual(self.run_job()["generated"], 2)
        self.assertEqual(self.run_job()["generated"], 0)
        changed_scope = plan(); changed_scope["scope"] = "another-lesson"
        body = {k: changed_scope[k] for k in ("schemaVersion", "kind", "provider", "scope", "tasks")}
        changed_scope["id"] = p.digest(p.canonical(body).encode())
        self.assertEqual(self.run_job(changed_scope)["reused"], 2)
        self.assertEqual(len(self.calls), 2)
        for receipt in self.work.glob("*.json"):
            data = p.read(receipt)
            if "technicalCheck" in data:
                self.assertFalse(data["published"])
                self.assertIsNone(data["reviewedAt"])
                self.assertFalse(data["technicalCheck"]["pronunciationReviewed"])

    def test_no_network_without_explicit_cost_gate(self):
        for provider in ("gemini", "google-cloud"):
            with self.assertRaises(ValueError):
                p.run(plan(provider=provider), self.work, env={}, synthesize=self.synth)
        self.assertFalse(self.calls)
        self.assertFalse((self.work / "registry.sqlite3").exists())

    def test_persistent_request_budget_across_resumes(self):
        self.assertEqual(self.run_job(max_requests=1)["generated"], 1)
        self.assertEqual(self.run_job(max_requests=1)["stopped"], "budget")
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.run_job(max_requests=2)["generated"], 1)

    def test_monthly_budget_spans_jobs(self):
        self.assertEqual(self.run_job(plan(("eres",)), month_limit=4)["generated"], 1)
        self.assertEqual(self.run_job(plan(("de",)), month_limit=4)["stopped"], "budget")
        self.assertEqual(len(self.calls), 1)

    def test_daily_budget_spans_jobs_and_counts_failed_requests(self):
        self.assertEqual(self.run_job(plan(("eres",)), daily_limit=1)["generated"], 1)
        self.assertEqual(self.run_job(plan(("de",)), daily_limit=1)["stopped"], "budget")
        self.assertEqual(len(self.calls), 1)

    def test_pacing_uses_reserved_request_time_without_unbounded_sleep(self):
        with patch.object(p.time, "sleep") as sleep:
            self.run_job(min_interval=22)
        self.assertEqual(sleep.call_count, 1)
        self.assertGreater(sleep.call_args.args[0], 0)
        self.assertLessEqual(sleep.call_args.args[0], 22)

    def test_character_budget_reserves_before_request(self):
        def verify_reserved(request, key):
            with sqlite3.connect(self.work / "registry.sqlite3") as db:
                self.assertEqual(db.execute("SELECT status FROM clips").fetchone()[0], "inflight")
                self.assertEqual(db.execute("SELECT characters FROM attempts").fetchone()[0], 4)
            return wav()
        result = p.run(plan(), self.work, ENV, verify_reserved, character_limit=4)
        self.assertEqual(result["generated"], 1)
        self.assertEqual(result["stopped"], "budget")

    def test_uncertain_request_is_never_automatically_retried(self):
        def fail(request, key):
            self.calls.append(request); raise TimeoutError("uncertain response")
        with self.assertRaises(TimeoutError): p.run(plan(), self.work, ENV, fail)
        result = self.run_job()
        self.assertEqual(result["held"], 1)
        self.assertEqual(result["generated"], 1)
        self.assertEqual(len(self.calls), 2)

    def test_corrupt_cached_candidate_is_held_not_regenerated(self):
        self.run_job(plan(("eres",)))
        next(self.work.glob("*.wav")).write_bytes(b"corrupt")
        self.assertEqual(self.run_job(plan(("eres",)))["held"], 1)
        self.assertEqual(len(self.calls), 1)

    def test_concurrent_worker_is_rejected(self):
        with (self.work / "worker.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaisesRegex(ValueError, "Another audio worker"):
                self.run_job()
        self.assertFalse(self.calls)

    def test_edited_plan_and_mixed_provider_are_rejected(self):
        job = plan(); job["tasks"][0]["request"]["text"] = "changed"
        with self.assertRaises(ValueError): self.run_job(job)
        job = plan(); job["tasks"][0]["request"]["provider"] = "google-cloud"
        body = {k: job[k] for k in ("schemaVersion", "kind", "provider", "scope", "tasks")}
        job["id"] = p.digest(p.canonical(body).encode())
        with self.assertRaises(ValueError): self.run_job(job)
        self.assertFalse(self.calls)

    def test_bad_audio_is_held_and_never_approved(self):
        result = p.run(plan(("eres",)), self.work, ENV, lambda *_: wav(silent=True))
        self.assertEqual(result["held"], 1)
        self.assertEqual(self.run_job(plan(("eres",)))["held"], 1)
        self.assertFalse(self.calls)


class PlanningTests(unittest.TestCase):
    def test_preserves_diacritics_and_spoken_alternatives(self):
        self.assertEqual(p.spoken("Mi\u0300nh / Tôi"), "Mình, Tôi")
        self.assertEqual(p.spoken("từ / của"), "từ, của")
        self.assertEqual(p.spoken("aprendí"), "aprendí")

    def test_benchmark_is_small_stable_and_unpublished(self):
        with patch.object(p, "existing", return_value=({}, {}, {}, [])):
            first = p.make_plan("gemini", benchmark=True)
            self.assertEqual(first, p.make_plan("gemini", benchmark=True))
        self.assertEqual(first["generationRequests"], 18)
        self.assertLess(first["estimatedCharacters"], 4000)
        self.assertFalse(any("/" in t["request"]["text"] for t in first["tasks"]))
        config = p.read(ROOT / "audio/cloud-audio-candidates.json")
        self.assertTrue(all(not r.get("approvedAt") or (r.get("approvalEvidence") and len(r.get("referenceAudioSha256", "")) == 64) for v in config["providers"].values() for r in v["profiles"]))

    def test_batches_do_not_repeat_missing_requests(self):
        with patch.object(p, "existing", return_value=({}, {}, {}, [])):
            first = p.make_plan("gemini", benchmark=True, limit=5)
            second = p.make_plan("gemini", benchmark=True, limit=5, offset=first["nextOffset"])
        self.assertEqual(first["generationRequests"], 5)
        self.assertFalse({t["key"] for t in first["tasks"]} & {t["key"] for t in second["tasks"]})

    def test_voice_setting_changes_key_but_ui_text_normalization_does_not(self):
        config = p.read(ROOT / "audio/cloud-audio-candidates.json")
        config["benchmark"] = [{"language": "es", "text": "aprendí"}]
        with patch.object(p, "existing", return_value=({}, {}, {}, [])), patch.object(p, "read", return_value=config):
            first = p.make_plan("gemini", benchmark=True)
            config["benchmark"][0]["text"] = "  aprendi\u0301  "
            second = p.make_plan("gemini", benchmark=True)
            self.assertEqual(first["tasks"][0]["key"], second["tasks"][0]["key"])
            config["providers"]["gemini"]["profiles"][0]["settings"]["style"] = "different pace"
            third = p.make_plan("gemini", benchmark=True)
            self.assertNotEqual(first["tasks"][0]["key"], third["tasks"][0]["key"])

    def test_coverage_requires_physical_hash_matching_file(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); lesson = "a1-u1-test-lesson"
            p.save(root / "audio/inventory-es-vi.json", {"items": [{"language": "es", "text": "eres", "sources": [lesson + ":word"]}]})
            p.save(root / "audio/generated/ios-approved-v1/curriculum.json", {"lessons": [{"id": lesson, "unit": 1, "level": "A1"}]})
            data = wav(); sha = p.digest(data)
            row = {"file": sha + ".wav", "language": "es", "normalizedText": "eres", "sha256": sha}
            with patch.object(p, "existing", return_value=({"clips": [row]}, {"clips": [row]}, {}, [row])):
                self.assertFalse(p.audit(root)["launchReady"])
                target = root / "public/audio/native/assets" / row["file"]
                target.parent.mkdir(parents=True); target.write_bytes(data)
                self.assertTrue(p.audit(root)["launchReady"])
                target.write_bytes(b"wrong recording")
                self.assertFalse(p.audit(root)["launchReady"])

    def test_rest_adapters_request_and_parse_audio_without_sdk(self):
        for provider in ("gemini", "google-cloud"):
            captured = []
            request = plan(provider=provider)["tasks"][0]["request"]
            request["settings"] = {"pace": 1} if provider == "google-cloud" else {"style": "native, deliberate"}
            encoded = base64.b64encode(wav()).decode()
            response = {"audioContent": encoded} if provider == "google-cloud" else {"status": "completed", "steps": [{"type": "model_output", "content": [{"type": "audio", "data": encoded}]}]}
            def fake_open(call, timeout):
                captured.append(json.loads(call.data)); return io.BytesIO(json.dumps(response).encode())
            with patch.object(p.urllib.request, "urlopen", side_effect=fake_open):
                self.assertEqual(p.cloud_audio(request, "not-real"), wav())
            if provider == "gemini":
                self.assertEqual(captured[0]["input"][0]["content"][0]["text"], "eres")
                self.assertEqual(captured[0]["generation_config"]["speech_config"][0]["voice"], "test")
            else:
                self.assertEqual(captured[0]["audioConfig"]["speakingRate"], 1)

    def test_admission_rejects_old_voice_and_blocked_recordings(self):
        seed = p.read(ROOT / "ios/LinguaThread/NativeAudio/manifest.json")
        row = copy.deepcopy(seed["clips"][0]); policies = seed["voicePolicies"]
        self.assertTrue(p.permitted(row, policies, set()))
        self.assertFalse(p.permitted(row, policies, {row["sha256"]}))
        row["voiceReferenceSha256"] = "old"
        self.assertFalse(p.permitted(row, policies, set()))

    def test_wav_silence_clipping_and_truncation(self):
        self.assertEqual(p.inspect_wav(wav())["status"], "technical-pass")
        self.assertIn("silence-or-near-silence", p.inspect_wav(wav(silent=True))["flags"])
        self.assertIn("clipping-risk", p.inspect_wav(wav(clipped=True))["flags"])
        with self.assertRaises(ValueError): p.inspect_wav(wav()[:-100])


class PrivateSetupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.root = Path(self.temp.name)
        self.key = "synthetic-test-key-never-sent-to-provider"

    def tearDown(self): self.temp.cleanup()

    def test_owner_only_storage_and_load_without_network(self):
        with patch.object(p.urllib.request, "urlopen", side_effect=AssertionError("Setup must not call API")):
            p.configure_free_project(self.key, "FREE", self.root)
            self.assertEqual((self.root / p.LOCAL_CONFIG).stat().st_mode & 0o777, 0o600)
            env = p.local_environment(self.root, {})
            self.assertEqual(env["GEMINI_API_KEY"], self.key)
            self.assertEqual(env["AUDIO_FREE_PROJECT_CONFIRMED"], "true")

    def test_no_file_without_free_confirmation_or_complete_key(self):
        for key, confirmation in ((self.key, "YES"), ("", "FREE"), ("key with spaces in it to catch a copy error", "FREE")):
            with self.assertRaises(ValueError): p.configure_free_project(key, confirmation, self.root)
        self.assertFalse((self.root / p.LOCAL_CONFIG).exists())

    def test_lowercase_free_is_accepted(self):
        p.configure_free_project(self.key, "free", self.root)
        self.assertEqual(p.local_environment(self.root, {})["AUDIO_FREE_PROJECT_CONFIRMED"], "true")

    def test_reject_shared_file_and_symlink(self):
        p.configure_free_project(self.key, "FREE", self.root)
        target = self.root / p.LOCAL_CONFIG; target.chmod(0o644)
        with self.assertRaises(ValueError): p.local_environment(self.root, {})
        private = self.root / "private"; target.rename(private)
        target.symlink_to(private)
        with self.assertRaises(OSError): p.local_environment(self.root, {})

    def test_different_environment_key_does_not_inherit_free_confirmation(self):
        p.configure_free_project(self.key, "FREE", self.root)
        env = p.local_environment(self.root, {"GEMINI_API_KEY": "different-project-key"})
        self.assertEqual(env["GEMINI_API_KEY"], "different-project-key")
        self.assertNotIn("AUDIO_FREE_PROJECT_CONFIRMED", env)

    def test_malformed_json_does_not_echo_its_contents(self):
        p.configure_free_project(self.key, "FREE", self.root)
        (self.root / p.LOCAL_CONFIG).write_text(self.key)
        with self.assertRaises(ValueError) as failure: p.local_environment(self.root, {})
        self.assertNotIn(self.key, str(failure.exception))


if __name__ == "__main__": unittest.main()
