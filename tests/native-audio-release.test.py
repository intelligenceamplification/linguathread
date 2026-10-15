import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location("native_release",Path(__file__).resolve().parents[1]/"scripts/verify-native-audio-pack.py")
release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)

class ReleaseGate(unittest.TestCase):
    def test_complete_coverage_bytes_and_isolation_are_required(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); inventory=root/'inventory.json'; registry=root/'voices.json'; defects=root/'defects.json'
            inventory.write_text(json.dumps({'items':[{'language':'es','text':'eres'}]}))
            registry.write_text(json.dumps({'voices':[{'language':'es','voice':'male','normalTempo':.85,'sourceReference':{'sha256':'approved-ref'}}]}))
            defects.write_text(json.dumps({'defects':[]}));data=b'checked candidate';digest=hashlib.sha256(data).hexdigest()
            (root/'clip.m4a').write_bytes(data)
            clip={'id':'test','language':'es','text':'eres','normalizedText':'eres','voice':'male','file':'clip.m4a','url':'linguathread-audio://pack/clip.m4a','sha256':digest,'normalTempo':.85,'auditVersion':2,'qualityCheck':'automated-text-pace-clarity','voiceReferenceSha256':'approved-ref','voiceApprovalBasis':'reference-hash'}
            pack={'releaseReady':True,'approvedAt':'2026-10-13','inventorySha256':hashlib.sha256(inventory.read_bytes()).hexdigest(),'voiceRegistrySha256':hashlib.sha256(registry.read_bytes()).hexdigest(),'clips':[clip]}
            def check():
                pack['voicePolicies']=[{'language':'es','voice':'male','referenceSha256':'approved-ref','backend':settings['voices'][0].get('nativeBackend'),'recipeSha256':hashlib.sha256(recipe.read_bytes()).hexdigest() if settings['voices'][0].get('nativeRecipePath') else None,'normalTempo':.85}]
                (root/'manifest.json').write_text(json.dumps(pack));return release.verify(root,inventory,registry,defects)
            settings=json.loads(registry.read_text())
            self.assertEqual(check(),1)
            settings=json.loads(registry.read_text())
            settings['voices'][0]['nativeBackend']='accepted-spanish-backend'
            recipe=root/'recipe.json';recipe.write_text('{"pace":0.85}')
            settings['voices'][0]['nativeRecipePath']=str(recipe)
            registry.write_text(json.dumps(settings));pack['voiceRegistrySha256']=hashlib.sha256(registry.read_bytes()).hexdigest()
            with self.assertRaisesRegex(ValueError,'Superseded Spanish backend'):check()
            clip['backend']='accepted-spanish-backend'
            with self.assertRaisesRegex(ValueError,'Superseded Spanish recipe'):check()
            clip['recipeSha256']=hashlib.sha256(recipe.read_bytes()).hexdigest()
            self.assertEqual(check(),1)
            recipe.write_text('{"pace":1.0}')
            with self.assertRaisesRegex(ValueError,'Superseded Spanish recipe'):check()
            recipe.write_text('{"pace":0.85}')
            clip['voiceReferenceSha256']='old-ref'
            with self.assertRaisesRegex(ValueError,'Unproven'):check()
            clip['voiceReferenceSha256']='approved-ref'
            pack['clips']=[]
            with self.assertRaisesRegex(ValueError,'Incomplete'):check()
            pack['clips']=[clip];clip['url']='/audio/packs/old/clip.m4a'
            with self.assertRaisesRegex(ValueError,'Legacy'):check()
            clip['url']='linguathread-audio://pack/clip.m4a';(root/'clip.m4a').write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError,'Changed'):check()

if __name__=='__main__':unittest.main()
