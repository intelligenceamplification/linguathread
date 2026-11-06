"""Bounded resumable local lesson generation. Candidates only; never publishes."""
import argparse, datetime, fcntl, json, os, subprocess, time
from pathlib import Path
from audio_pipeline import ROOT, WORK, canonical, digest, existing, inspect_wav, read, save, spoken
OUT=ROOT/'audio/generated'/os.environ.get('AUDIO_LOCAL_BATCH','review-'+datetime.date.today().strftime('%Y%m%d'))

def plan():
    destination=OUT/'plan.json'
    if destination.exists():return read(destination)
    import importlib.util,re
    match=re.search(r"(\d{8})",OUT.name)
    if not match:raise ValueError('Batch directory must include YYYYMMDD')
    stamp=match.group(1);date=f"{stamp[:4]}-{stamp[4:6]}-{stamp[6:]}"
    spec=importlib.util.spec_from_file_location('review_planner',ROOT/'scripts/plan-review-audio-batch.py')
    planner=importlib.util.module_from_spec(spec);spec.loader.exec_module(planner)
    indexed=re.fullmatch(r'review-\d{8}-(\d+)',OUT.name)
    batch_index=int(indexed.group(1)) if indexed else 1
    planned=planner.build(date,20,batch_index)
    if not destination.exists():save(destination,planned)
    return planned

def generate(language):
    import numpy as np, soundfile as sf
    batch=plan()
    cloud_count=len(read(Path(batch['cloudPlan']))['tasks']) if batch.get('cloudPlan') else 0
    if len(batch['localTasks'])+cloud_count>20:raise ValueError('Review batch exceeds the 20-clip cap')
    tasks=[t for t in batch['localTasks'] if t['language']==language]
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
        result=plan();print(json.dumps(dict(local=len(result['localTasks']),cloud=len(read(Path(result['cloudPlan']))['tasks']) if result.get('cloudPlan') else 0,plan=str(OUT/'plan.json'))))
    else:
        OUT.mkdir(parents=True,exist_ok=True)
        with (ROOT/'audio/generated/.local-generation.lock').open('w') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX | fcntl.LOCK_NB)
            generate(args.action)
