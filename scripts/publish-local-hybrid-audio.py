"""Stage exact listened-and-accepted local clips. No generation or deployment."""
import argparse,json,shutil,unicodedata
from audio_pipeline import ROOT,read,save,digest,canonical,inspect_wav,permitted,accepted_local_policies

def prepare():
    ledger=read(ROOT/'audio/local-hybrid-listening-approvals.json')
    profiles={p['id']:p for p in read(ROOT/'audio/local-voice-profiles.json')['profiles']}
    policies=accepted_local_policies();clips=[];copies={}
    blocked={r['sha256'] for r in read(ROOT/'audio/known-audio-defects.json')['defects'] if r['status']=='blocked'}
    for batch in ledger['batches']:
        if not batch.get('reviewedAt') or not batch.get('approvalEvidence'):raise ValueError('Listening acceptance missing')
        for item in batch['clips']:
            if item['language']=='es':continue
            profile=profiles[item['profile']]
            policy=next(p for p in policies if p['referenceSha256']==profile['referenceSha256'])
            source=ROOT/batch.get('candidateDirectory', 'audio/generated/'+('hybrid-20261104-extra' if batch['id'].endswith('-extra') else 'hybrid-20261104'))
            if (ROOT/'audio/generated').resolve() not in source.resolve().parents:raise ValueError('Unsafe candidate directory')
            rows=[json.loads(l) for l in (source/'metadata.jsonl').read_text().splitlines()]
            row=next(r for r in rows if r['id']==item['id'])
            if row['profile']!=profile or row['sourceText']!=item['text'] or row['sha256']!=item['sha256']:raise ValueError('Approved identity changed')
            path=source/row['file'];data=path.read_bytes();sha=digest(data)
            if sha!=item['sha256'] or inspect_wav(data)['status']!='technical-pass':raise ValueError('Accepted file missing or changed')
            clip=dict(id='local-'+item['id'][:20],language=item['language'],voice=profile['gender'],text=item['text'],normalizedText=' '.join(unicodedata.normalize('NFC',item['text']).split()),file=sha+'.wav',url='linguathread-audio://pack/'+sha+'.wav',sha256=sha,voiceReferenceSha256=profile['referenceSha256'],voiceApprovalBasis='explicit-listening-approval',backend=profile['backend'],recipeSha256=policy['recipeSha256'],normalTempo=profile['normalTempo'],paceCorrectionFactor=row.get('paceCorrectionFactor',1),auditVersion=2,qualityCheck='human-text-pace-clarity',reviewedAt=batch['reviewedAt'],preferred=True,accent=profile['accent'],profileId=profile['id'],batchReviewId=batch['id'],screeningResult=item['screen'])
            if not permitted(clip,policies,blocked):raise ValueError('Local admission failed')
            clips.append(clip);copies[clip['file']]=path
    return policies,clips,copies

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    policies,clips,copies=prepare()
    seedpath=ROOT/'ios/LinguaThread/NativeAudio/manifest.json';seed=read(seedpath)
    references={p['referenceSha256'] for p in read(ROOT/'audio/local-voice-profiles.json')['profiles']}
    references.update(policy['referenceSha256'] for policy in policies)
    combined=[p for p in seed['voicePolicies'] if p['referenceSha256'] not in references]+policies
    if args.apply:
        seed['voicePolicies']=combined
        blocked={r['sha256'] for r in read(ROOT/'audio/known-audio-defects.json')['defects'] if r['status']=='blocked'}
        seed['blockedAudioSha256']=sorted(set(seed.get('blockedAudioSha256',[]))|blocked)
        save(seedpath,seed)
        inventory=read(ROOT/'outputs/launch-audio-inventory.json')['items']
        for location in ['public/audio/native/library.json','public/audio/packs/approved.json','audio/generated/ios-approved-v1/manifest.json']:
            path=ROOT/location;pack=read(path);existing={r['sha256']:r for r in pack['clips']}
            for clip in clips:
                entry=dict(clip)
                if '/packs/' in location:entry['url']='/audio/native/assets/'+clip['file']
                existing[clip['sha256']]=entry
            pack['clips']=list(existing.values())
            if 'voicePolicies' in pack:pack['voicePolicies']=combined
            if location.startswith('public/'):
                pack['approvedAt']=max(c['reviewedAt'] for c in clips)
                pack['packVersion']='approved-hybrid-'+pack['approvedAt'].replace('-','')
            if location=='public/audio/native/library.json':
                for clip in clips:
                    for item in inventory:
                        if (item['language'],item['text'])==(clip['language'],clip['text']):
                            for source in item['sources']:
                                urls=pack.setdefault('lessonAudio',{}).setdefault(source.split(':',1)[0],[])
                                if clip['url'] not in urls:urls.append(clip['url'])
            if location=="public/audio/native/library.json":
                path.write_text(json.dumps(pack,ensure_ascii=False,separators=(",",":")))
            else:save(path,pack)
        for file,source in copies.items():shutil.copy2(source,ROOT/'public/audio/native/assets'/file)
    print(canonical(dict(acceptedLocalClips=len(clips),applied=args.apply,deployed=False)))
if __name__=='__main__':main()
