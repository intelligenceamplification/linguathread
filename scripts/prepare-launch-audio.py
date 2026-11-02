"""Offline launch-audio readiness/estimate; never generates, approves, or publishes."""
import argparse
from pathlib import Path
from audio_pipeline import ROOT, WORK, read, save, digest


def prepare(inventory_path, budget):
    if not 0 < budget <= 100:
        raise ValueError('Planning allowance must be between zero and $100')
    inventory = read(inventory_path)
    items = inventory['items']
    approved = {}
    for row in read(ROOT / 'audio/cloud-listening-approvals.json')['clips']:
        receipt = read(WORK / (row['requestKey'] + '.json'))
        if row['sha256'] != receipt['sha256'] or digest((WORK / receipt['file']).read_bytes()) != row['sha256']:
            raise ValueError('Accepted file identity changed')
        task = receipt['task']
        approved[(task['language'], task['displayText'])] = row['sha256']
    config = read(ROOT / 'audio/cloud-audio-candidates.json')['providers']['gemini']
    enabled = {p['language'] for p in config['profiles'] if p.get('approvedAt') and p.get('generationEnabled', True)}
    missing = [dict(item, state='ready-for-generation-plan' if item['language'] in enabled else 'voice-audition-required') for item in items if (item['language'], item['text']) not in approved]
    report = dict(schemaVersion=1, inventory=str(inventory_path.relative_to(ROOT)), generated=0, billingChanged=False,
                  planningAllowanceUSD=budget, estimateBasis='2026 standard Gemini 3.8 Flash TTS, $0.0135/minute output; 4.28s illustrative average; input, retries, taxes and new content extra',
                  estimatedOutputUSD=round(len(missing)*4.28/60*.0135,2),
                  counts={lang:dict(inventory=sum(x['language']==lang for x in items),missing=sum(x['language']==lang for x in missing)) for lang in ('en','es','vi')},
                  missing=missing, exclusions=['New English communication course material not yet authored','Multiple renditions per text','Later launch languages'],
                  note='This allowance is a planning value, not authorization to spend. The worker remains capped at ten free requests per day. Unsampled batch approvals require separate exact receipt evidence.')
    save(ROOT / 'outputs/launch-audio-readiness.json', report)
    return {k:v for k,v in report.items() if k!='missing'}

if __name__=='__main__':
    import json
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory',type=Path,default=ROOT/'outputs/launch-audio-inventory.json')
    parser.add_argument('--planning-allowance',type=float,default=40)
    args=parser.parse_args()
    print(json.dumps(prepare(args.inventory.resolve(),args.planning_allowance)))
