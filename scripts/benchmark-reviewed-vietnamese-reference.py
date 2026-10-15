"""Isolated test of an exact accepted native recording as conditioning audio.

No registry changes, family adoption, utterance approvals or publication.
"""
import hashlib
import json
from pathlib import Path
import time

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'audio/generated/vietnamese-reviewed-reference-pilot'
REFERENCE = ROOT / 'audio/generated/vietnamese-backend-benchmark/candidate-2.wav'
DIGEST = 'd4958ba0f2d88ad4630be52fc7a918af0c51a91b0e06dcfb61a1b168a89407b4'


def main():
    import numpy as np
    import soundfile as sf
    from vieneu import Vieneu
    reviews = json.loads((ROOT/'audio/listening-reviews-ios-v1.json').read_text())['reviews']
    if hashlib.sha256(REFERENCE.read_bytes()).hexdigest() != DIGEST or not any(r['sha256'] == DIGEST and r['language'] == 'vi' and r['voice'] == 'female' and r['approved'] for r in reviews):
        raise ValueError('Exact accepted reference missing')
    proof = json.loads((ROOT/'audio/vietnamese-recipe-v1.json').read_text())
    for model in proof['models']:
        for name, digest in model['files'].items():
            if hashlib.sha256((ROOT/model['snapshot']/name).read_bytes()).hexdigest() != digest:
                raise ValueError('Pinned checkpoint changed')
    backbone = ROOT/proof['models'][0]['snapshot']
    tts = Vieneu(backbone_repo=str(backbone), onnx_dir=str(backbone/'onnx_update'), backend='onnx', device='cpu', precision='fp32', threads=4, babble_retries=2)
    WORK.mkdir(exist_ok=True)
    with (WORK/'samples.jsonl').open('w') as log:
        for index,text in enumerate(['bà','bá','bả','bã','bạ','sửa','ẵ','ẫ','ễ','ỗ','ỡ','ữ','Tôi không muốn khiến bạn cảm thấy bị phớt lờ.']):
            started = time.monotonic()
            audio = tts.infer(text, ref_audio=str(REFERENCE), denoise=False, temperature=.8, apply_watermark=False)
            if not len(audio) or not np.isfinite(audio).all():
                raise ValueError('Invalid generated signal')
            gain = min(1, .95/max(.0001,float(np.max(np.abs(audio)))))
            path = WORK/f'candidate-{index}.wav';sf.write(path,audio*gain,tts.sample_rate,subtype='PCM_16')
            row = dict(id=f'vi-reviewed-ref-{index}',language='vi',voice='female',sourceText=text,spokenText=text,file=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),referenceSha256=DIGEST,backend='VieNeu-TTS-v3-Turbo',normalTempo=1,elapsedSeconds=time.monotonic()-started,approved=False)
            log.write(json.dumps(row,ensure_ascii=False)+'\n');log.flush();print(text,round(row['elapsedSeconds'],2),flush=True)


if __name__ == '__main__':
    main()
