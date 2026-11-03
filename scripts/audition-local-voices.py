"""Small offline voice audition; no app/catalog changes or approval granted."""
import argparse, hashlib, json, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'audio/generated/auditions-20261103'

def save_row(row):
    with (OUT/'metadata.jsonl').open('a') as f:f.write(json.dumps(row,ensure_ascii=False)+'\n')
    print(row['voice'],round(row['elapsedSeconds'],2),'s generation /',round(row['durationSeconds'],2),'s audio',flush=True)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('backend',choices=['vietnamese','english']);parser.add_argument('--assets',type=Path);args=parser.parse_args();OUT.mkdir(parents=True,exist_ok=True)
    import numpy as np, soundfile as sf
    if args.backend=='vietnamese':
        from vieneu import Vieneu
        proof=json.loads((ROOT/'audio/vietnamese-recipe-v1.json').read_text());base=ROOT/proof['models'][0]['snapshot']
        start=time.monotonic();tts=Vieneu(backbone_repo=str(base),onnx_dir=str(base/'onnx_update'),backend='onnx',device='cpu',threads=4,precision='fp32',babble_retries=0);load=time.monotonic()-start
        print('Model load seconds',round(load,2),flush=True)
        text='Hôm nay tôi học tiếng Việt. Bạn có thể nói chậm hơn một chút được không?'
        for voice,accent,gender in [('Phạm Tuyên','Northern','male'),('Adam','Southern','male'),('Thục Đoan','Southern','female'),('Trúc Ly','Northern','female')]:
            destination=OUT/('vi-'+hashlib.sha256(voice.encode()).hexdigest()[:10]+'.wav')
            if destination.exists():continue
            start=time.monotonic();audio=tts.infer(text,voice=voice,temperature=.5,denoise=False,apply_watermark=False);elapsed=time.monotonic()-start
            if not len(audio) or not np.isfinite(audio).all():raise ValueError('Invalid audio')
            sf.write(destination,audio,tts.sample_rate,subtype='PCM_16')
            save_row(dict(language='vi',voice=voice,gender=gender,accentCandidate=accent,accentBasis='Installed preset metadata; not independently validated',text=text,file=str(destination),sha256=hashlib.sha256(destination.read_bytes()).hexdigest(),elapsedSeconds=elapsed,durationSeconds=len(audio)/tts.sample_rate,loadSeconds=load,backend='VieNeu-TTS-v3-Turbo',status='audition-only'))
    else:
        import torch
        from kokoro import KPipeline,KModel
        torch.set_num_threads(4);assets=args.assets
        start=time.monotonic();model=KModel(repo_id='hexgrad/Kokoro-82M',config=str(assets/'config.json'),model=str(assets/'kokoro-v1_0.pth')).eval();load=time.monotonic()-start
        text='I would like to understand how this works. Could you explain it clearly, and give me an example?'
        for voice,accent,gender,code in [('af_sky','American','female','a'),('am_michael','American','male','a'),('bf_emma','British','female','b'),('bm_george','British','male','b')]:
            destination=OUT/('en-'+voice+'.wav')
            if destination.exists():continue
            pipeline=KPipeline(lang_code=code,model=model,repo_id='hexgrad/Kokoro-82M');start=time.monotonic();results=list(pipeline(text,voice=str(assets/(voice+'.pt')),speed=1));audio=np.concatenate([r.audio.detach().cpu().numpy() for r in results]);elapsed=time.monotonic()-start
            sf.write(destination,audio,24000,subtype='PCM_16')
            save_row(dict(language='en',voice=voice,gender=gender,accentCandidate=accent,accentBasis='Official voice listing; specific subregion not established',text=text,file=str(destination),sha256=hashlib.sha256(destination.read_bytes()).hexdigest(),elapsedSeconds=elapsed,durationSeconds=len(audio)/24000,loadSeconds=load,backend='Kokoro-82M',status='audition-only'))
if __name__=='__main__':main()
