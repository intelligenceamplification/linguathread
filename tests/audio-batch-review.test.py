import sys, unittest, copy
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from audio_batch_review import validate_batch

class BatchReviewTests(unittest.TestCase):
    def setUp(self):
        self.batch = dict(id='test', reviewedAt='2026-11-02', approvalEvidence='Accepted sample', clips=[dict(requestKey=str(i), sha256='hash'+str(i)) for i in range(4)], sampledRequestKeys=['0','1','2'])
        self.receipts = {str(i):dict(sha256='hash'+str(i),task=dict(request=dict(model='model',voice='voice',locale='es-ES',settings={},text='A longer teaching phrase'))) for i in range(4)}
        self.checks = {str(i):dict(sha256='hash'+str(i), status='automated-pass',flags=[],model='recognizer',auditVersion=2) for i in range(4)}
    def test_unsampled_is_not_individual(self):
        rows=validate_batch(self.batch,self.receipts,self.checks)
        self.assertTrue(rows[0]['individuallyHeard']);self.assertFalse(rows[3]['individuallyHeard'])
    def test_failure_requires_hold(self):
        self.checks['3']['flags']=['text-mismatch']
        with self.assertRaises(ValueError):validate_batch(self.batch,self.receipts,self.checks)
        self.batch['heldRequestKeys']=['3']
        self.assertEqual(len(validate_batch(self.batch,self.receipts,self.checks)),3)
    def test_changed_hash_rejected(self):
        self.checks['3']['sha256']='changed'
        with self.assertRaises(ValueError):validate_batch(self.batch,self.receipts,self.checks)
    def test_short_words_require_listening(self):
        self.receipts['3']['task']['request']['text']='de'
        with self.assertRaises(ValueError):validate_batch(self.batch,self.receipts,self.checks)
    def test_unsampled_new_voice_rejected(self):
        self.receipts['3']['task']['request']['voice']='different'
        with self.assertRaises(ValueError):validate_batch(self.batch,self.receipts,self.checks)
    def test_insufficient_samples_rejected(self):
        self.batch['sampledRequestKeys']=['0']
        with self.assertRaises(ValueError):validate_batch(self.batch,self.receipts,self.checks)
if __name__=='__main__':unittest.main()
