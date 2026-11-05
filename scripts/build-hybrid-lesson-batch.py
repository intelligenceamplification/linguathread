"""Bounded resumable local lesson generation. Candidates only; never publishes."""
import argparse, fcntl, json, os, subprocess, time
from pathlib import Path
from audio_pipeline import ROOT, WORK, canonical, digest, existing, inspect_wav, read, save, spoken
OUT=ROOT/'audio/generated'/os.environ.get('AUDIO_LOCAL_BATCH','hybrid-20261104')

def plan():
    OUT.mkdir(parents=True,exist_ok=True)
    destination=OUT/'plan.json'
    if destination.exists(): return read(destination)
    _,public,_,usable=existing()
    covered={(r['language'],r['normalizedText']) for r in usable+public['clips']}
    deferred=ROOT/'audio/pending-pronunciation-repairs.json'
    if deferred.exists():covered.update((r['language'],r['text']) for r in read(deferred)['priorityItems'] if r['status']=='awaiting-next-free-quota-and-audition')
    inventory=read(ROOT/'outputs/launch-audio-inventory.json')['items']
    profiles=read(ROOT/'audio/local-voice-profiles.json')['profiles']
    config=read(ROOT/'audio/cloud-audio-candidates.json')['providers']['gemini']
    tasks=[];cloud=[]
    for language,count in [('es',10),('vi',24),('en',26)]:
        candidates=[i for i in inventory if i['language']==language and (language,i['text']) not in covered and any(s.endswith(':sentence') for s in i['sources'])]
        selected=candidates[:count]
        if len(selected)!=count:raise ValueError('Insufficient distinct uncovered main sentences')
        cycle=['vi-1','vi-2','vi-4','vi-3'] if language=='vi' else read(ROOT/'audio/local-voice-profiles.json').get('englishCycle',['en-5','en-7','en-8'])
        for index,item in enumerate(selected):
            if language=='es':
                profile=[p for p in config['profiles'] if p['language']=='es' and p.get('approvedAt')][index%2]
                identity=dict(provider='gemini',model=config['model'],voice=profile['voiceId'],locale=profile['locale'],text=spoken(item['text']),settings=profile['settings'],normalizerVersion=1)
                cloud.append(dict(key=digest(canonical(identity).encode()),request=identity,displayText=item['text'],language='es',role=profile['role'],reuseSha256=None))
            else:
                profile=next(p for p in profiles if p['id']==cycle[index%len(cycle)])
                identity=dict(language=language,spokenText=spoken(item['text']),profile=profile)
                tasks.append(dict(id=digest(canonical(identity).encode()),language=language,sourceText=item['text'],spokenText=spoken(item['text']),profile=profile,sources=item['sources']))
    body=dict(schemaVersion=1,kind='lesson-candidates',provider='gemini',scope='20261104-distinct-missing-main-sentences',tasks=cloud)
    cloudplan=dict(body,id=digest(canonical(body).encode()),generationRequests=10,estimatedCharacters=sum(len(t['request']['text'])+len(t['request']['settings'].get('style','')) for t in cloud),nextOffset=None)
    save(WORK/'plans/daily-20261104.json',cloudplan)
    result=dict(schemaVersion=1,date='2026-11-04',localTasks=tasks,cloudPlan=str(WORK/'plans/daily-20261104.json'),published=False)
    save(destination,result);return result

def generate(language):
    import numpy as np, soundfile as sf
    batch=plan(); tasks=[t for t in batch['localTasks'] if t['language']==language]
    done={r['id']:r for r in (json.loads(l) for l in (OUT/'metadata.jsonl').read_text().splitlines())} if (OUT/'metadata.jsonl').exists() else {}
    start=time.monotonic()
    if language=='vi':
        from vieneu import Vieneu
        base=ROOT/read(ROOT/'audio/vietnamese-recipe-v1.json')['models'][0]['snapshot']
        model=Vieneu(backbone_repo=str(base),onnx_dir=str(base/'onnx_update'),backend='onnx',device='cpu',threads=4,precision='fp32',babble_retries=0)
        binaries=list((ROOT/'.voxcpm-venv').glob('lib/python*/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-*'))
        if len(binaries)!=1:raise ValueError('Expected one installed FFmpeg binary')
        ffmpeg=str(binaries[0])
    else:
        import torch
        from kokoro import KModel,KPipeline
        torch.set_num_threads(4)
        assets=ROOT/'audio/generated/auditions-20261103/kokoro-assets'
        model=KModel(repo_id='hexgrad/Kokoro-82M',config=str(assets/'config.json'),model=str(assets/'kokoro-v1_0.pth')).eval()
        pipelines={code:KPipeline(lang_code=code,model=model,repo_id='hexgrad/Kokoro-82M') for code in ['a','b']}
    load=time.monotonic()-start
    for task in tasks:
        active=next(p for p in read(ROOT/'audio/local-voice-profiles.json')['profiles'] if p['id']==task['profile']['id'])
        if not active.get('generationEnabled',True):raise ValueError('Retired voice cannot generate')
        if task.get('generationSeed') is not None:
            import random
            random.seed(task['generationSeed']);np.random.seed(task['generationSeed'])
        file=OUT/(task['id']+'.wav');profile=task['profile']
        if task['id'] in done:
            if file.exists() and digest(file.read_bytes())==done[task['id']]['sha256']:continue
            raise ValueError('Existing candidate changed')
        start=time.monotonic()
        if language=='vi':
            audio=model.infer(task['spokenText'],voice=profile['voiceName'],temperature=task.get('temperature',.5),denoise=False,apply_watermark=False);rate=model.sample_rate
        else:
            voice=profile['voiceName'];pipeline=pipelines['b' if voice.startswith('b') else 'a']
            arguments=dict(voice=str(assets/(voice+'.pt')),speed=task.get('synthesisSpeed',1))
            result=list(pipeline.generate_from_tokens(task['phonemes'],**arguments) if task.get('phonemes') else pipeline(task['spokenText'],**arguments))
            audio=np.concatenate([r.audio.detach().cpu().numpy() for r in result]);rate=24000
        if not len(audio) or not np.isfinite(audio).all():raise ValueError('Invalid samples')
        raw=OUT/(task['id']+'-raw.wav') if language=='vi' else file
        sf.write(raw,audio,rate,subtype='PCM_16')
        if language=='vi':subprocess.run([ffmpeg,'-v','error','-y','-i',str(raw),'-af',f"atempo={profile['normalTempo']*task.get('paceCorrectionFactor',1)}",'-c:a','pcm_s16le',str(file)],check=True)
        check=inspect_wav(file.read_bytes())
        row=dict(task,voice=profile['gender'],file=file.name,sha256=digest(file.read_bytes()),technicalCheck=check,elapsedSeconds=time.monotonic()-start,modelLoadSeconds=load,status='candidate-awaiting-screen-and-listening',published=False)
        with (OUT/'metadata.jsonl').open('a') as f:f.write(json.dumps(row,ensure_ascii=False)+'\n')
        print(language,len(done)+1,profile['id'],round(row['elapsedSeconds'],2),flush=True);done[task['id']]=row
    rows=[json.loads(l) for l in (OUT/'metadata.jsonl').read_text().splitlines()]
    (OUT/f'{language}-metadata.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows if r['language']==language))
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['plan','vi','en']);args=parser.parse_args()
    if args.action=='plan':
        result=plan();print(json.dumps(dict(local=len(result['localTasks']),cloud=10,plan=str(OUT/'plan.json'))))
    else:
        OUT.mkdir(parents=True,exist_ok=True)
        with (ROOT/'audio/generated/.local-generation.lock').open('w') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX | fcntl.LOCK_NB)
            generate(args.action)
