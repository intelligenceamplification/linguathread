import importlib.util
import hashlib
import json
import shutil
import tempfile
from unittest.mock import patch
from pathlib import Path
from types import SimpleNamespace
import unittest

spec = importlib.util.spec_from_file_location("native_quality", Path(__file__).resolve().parents[1] / "scripts/audit-voice-audio.py")
quality = importlib.util.module_from_spec(spec)
spec.loader.exec_module(quality)
spec = importlib.util.spec_from_file_location("pack", Path(__file__).resolve().parents[1] / "scripts/build-native-audio-pack.py")
pack = importlib.util.module_from_spec(spec); spec.loader.exec_module(pack)

class NativeClarity(unittest.TestCase):
    def test_new_native_rejection_overrides_cached_generic_success(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            (root/'public/audio/packs').mkdir(parents=True)
            (root/'audio/generated/takes').mkdir(parents=True)
            (root/'scripts').mkdir()
            for file in ['audit-native-vietnamese.py','audit-voice-audio.py']:
                shutil.copyfile(Path(__file__).resolve().parents[1]/'scripts'/file, root/'scripts'/file)
            reference = b'approved reference'; audio = b'candidate waveform fixture'
            digest = hashlib.sha256(audio).hexdigest(); ref_sha = hashlib.sha256(reference).hexdigest()
            (root/'public/ref.wav').write_bytes(reference)
            (root/'public/audio/packs/approved.json').write_text('{"clips":[]}')
            (root/'audio/known-audio-defects.json').write_text('{"defects":[]}')
            model = 'vinai/PhoWhisper-small@a86b604c346caf7148c37512eafe783a16420adb:transformers-fp32-no-timestamps-v1'
            registry = {'voices':[{'language':'vi','voice':'female','sourceReference':{'url':'/ref.wav','sha256':ref_sha,'reviewedAt':'2026-10-14'},'nativeAuditModel':model}]}
            (root/'audio/voice-registry.json').write_text(json.dumps(registry))
            inventory = root/'audio/inventory.json'
            inventory.write_text(json.dumps({'items':[{'language':'vi','text':'hai','sources':[]}]}))
            takes = root/'audio/generated/takes'
            (takes/'clip.wav').write_bytes(audio)
            generic = {'auditVersion':2,'model':'small','status':'automated-pass','flags':[],'wordErrorRate':0,'characterErrorRate':0}
            candidate = {'id':'vi-test','language':'vi','voice':'female','sourceText':'hai','spokenText':'hai','sha256':digest,'file':'clip.wav','referenceSha256':ref_sha,'qualityCheck':generic}
            (takes/'metadata.jsonl').write_text(json.dumps(candidate)+'\n')
            native = dict(generic, id='vi-test', sha256=digest, model=model, expected='hai', transcript='ba', status='needs-review', flags=['text-mismatch'], wordErrorRate=1, characterErrorRate=1)
            audit = takes/'audit.jsonl'; audit.write_text(json.dumps(native)+'\n')
            output = root/'audio/generated/output'
            arguments = ['build-native-audio-pack.py','--inventory',str(inventory),'--output',str(output)]
            with patch.object(pack,'ROOT',root), patch('sys.argv',arguments):
                pack.main()
                self.assertEqual(json.loads((output/'coverage.json').read_text())['verifiedVariants'],0)
                native.update(transcript='hai',status='automated-pass',flags=[],wordErrorRate=0,characterErrorRate=0)
                audit.write_text(json.dumps(native)+'\n')
                pack.main()
                manifest = json.loads((output/'manifest.json').read_text())
                self.assertTrue(manifest['releaseReady'])
                self.assertEqual(manifest['clips'][0]['auditModel'],model)
                self.assertNotIn('reviewedAt',manifest['clips'][0])

    def test_letter_name_transcription_equivalence_does_not_relax_other_text(self):
        self.assertTrue(quality.text_matches('Esta es la letra erre.', 'Esta es la letra R.', 'es'))
        self.assertFalse(quality.text_matches('Esta es la letra erre.', 'Esta es la letra erre adiós.', 'es'))
        self.assertFalse(quality.text_matches('erre', 'r', 'es'))
        self.assertTrue(quality.text_matches('Esta es la letra a con tilde.', 'Esta es la letra acontilde.', 'es'))
        self.assertFalse(quality.text_matches('Esta es la letra i.', 'Esta es la letra y.', 'es'))
        self.assertFalse(quality.text_matches('Esta es la letra eñe.', 'Esta es la letra N.', 'es'))
        self.assertFalse(quality.text_matches('Esta es la letra u con diéresis.', 'Esta es la letra o con diéresis.', 'es'))
        self.assertFalse(quality.text_matches('từ', 'tự', 'vi'))
        self.assertTrue(quality.text_matches('sí', 'si', 'es'))
        self.assertFalse(quality.text_matches('mamá', 'mama', 'es'))
        self.assertFalse(quality.text_matches('Sí, puedo.', 'Si puedo.', 'es'))
    def test_historical_review_flags_cannot_admit_an_old_voice(self):
        self.assertFalse(pack.verified_voice_family('old-reference', 'approved-reference', 'old-clip', {}))
        self.assertTrue(pack.verified_voice_family('approved-reference', 'approved-reference', 'new-clip', {}))
        self.assertTrue(pack.verified_voice_family(None, 'approved-reference', 'approved-reference', {}))
        self.assertTrue(pack.verified_voice_family(None, 'approved-reference', 'reviewed-clip', {'reviewed-clip': {}}))
    def test_matching_words_do_not_override_uncertain_or_repetitive_speech(self):
        clear = SimpleNamespace(avg_logprob=-.1, no_speech_prob=.01, compression_ratio=1.2)
        self.assertEqual(quality.intelligibility_flags([clear]), [])
        uncertain = SimpleNamespace(avg_logprob=-1.5, no_speech_prob=.01, compression_ratio=1.2)
        self.assertIn("uncertain-speech", quality.intelligibility_flags([uncertain]))
        repeated = SimpleNamespace(avg_logprob=-.1, no_speech_prob=.01, compression_ratio=3)
        self.assertIn("repetition-risk", quality.intelligibility_flags([repeated]))
        self.assertIn("uncertain-speech", quality.intelligibility_flags([]))

if __name__ == "__main__": unittest.main()
