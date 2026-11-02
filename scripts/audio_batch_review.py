"""Validate explicitly accepted batch samples without inventing individual approval."""
import math
from audio_pipeline import ROOT, WORK, read, digest


def validate_batch(batch, receipts, checks):
    if not batch.get('id') or not batch.get('reviewedAt') or not batch.get('approvalEvidence'):
        raise ValueError('Batch requires explicit listening acceptance')
    members = batch.get('clips', [])
    keys = [item['requestKey'] for item in members]
    if not keys or len(keys) != len(set(keys)):
        raise ValueError('Empty or duplicate batch membership')
    samples = set(batch.get('sampledRequestKeys', []))
    if not samples.issubset(keys) or len(samples) < min(len(keys), max(3, math.ceil(len(keys) * .1))):
        raise ValueError('Insufficient or unknown listening samples')
    held = set(batch.get('heldRequestKeys', []))
    if not held.issubset(keys):
        raise ValueError('Unknown held recording')
    for key in keys:
        receipt = receipts[key]
        task = receipt['task']
        # Known problem words and very short phrases require direct listening.
        if (len(task['request']['text'].split()) <= 2) and key not in samples and key not in held:
            raise ValueError('Short or high-risk recording requires listening')
    # Ensure the sample covers every voice/recipe represented in released clips.
    def recipe(key):
        request = receipts[key]['task']['request']
        return (request['model'], request['voice'], request['locale'], str(sorted(request['settings'].items())))
    if {recipe(k) for k in keys if k not in held} - {recipe(k) for k in samples if k not in held}:
        raise ValueError('Sample must cover each voice recipe')
    accepted = []
    for item in members:
        key = item['requestKey']
        if key in held:
            continue
        receipt = receipts[key]
        check = checks.get(key)
        if item['sha256'] != receipt['sha256'] or not check or check.get('sha256') != item['sha256']:
            raise ValueError('Missing or changed screening identity')
        if check.get('status') != 'automated-pass' or check.get('flags') or not check.get('model') or check.get('auditVersion') != 2:
            raise ValueError('Failed or uncertain screening must be held')
        accepted.append(dict(item, reviewedAt=batch['reviewedAt'], approvalEvidence=batch['approvalEvidence'], batchReviewId=batch['id'], individuallyHeard=key in samples, auditModel=check['model']))
    return accepted


def accepted_batch_clips():
    ledger = ROOT / 'audio/cloud-batch-reviews.json'
    if not ledger.exists():
        return []
    accepted = []
    seen = set()
    for batch in read(ledger)['batches']:
        receipts = {item['requestKey']: read(WORK / (item['requestKey'] + '.json')) for item in batch['clips']}
        checks = {}
        for relative in batch['screeningFiles']:
            path = (ROOT / relative['path']).resolve()
            if WORK.resolve() not in path.parents or digest(path.read_bytes()) != relative['sha256']:
                raise ValueError('Screening evidence changed or outside audio workspace')
            import json
            for line in path.read_text().splitlines():
                row = json.loads(line)
                checks[row['id']] = row
        for item in validate_batch(batch, receipts, checks):
            if item['requestKey'] in seen:
                raise ValueError('Duplicate reviewed batch clip')
            seen.add(item['requestKey'])
            accepted.append(item)
    return accepted
