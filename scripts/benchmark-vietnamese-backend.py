"""Isolated cloning experiment. No registry changes, approvals, or publication."""
import hashlib
import json
from pathlib import Path
import subprocess
import time
import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'audio/generated/vietnamese-backend-benchmark'
proof = json.loads((WORK / 'model-provenance.json').read_text())
for model in proof['models']:
 for name, digest in model['files'].items():
  path = ROOT / model['snapshot'] / name
  if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
   raise ValueError('Benchmark checkpoint changed')
registry = json.loads((ROOT / 'audio/voice-registry.json').read_text())
voice = next(v for v in registry['voices'] if v['language']=='vi' and v['voice']=='female')
reference = voice['sourceReference']
source = ROOT / 'public' / reference['url'].lstrip('/')
if hashlib.sha256(source.read_bytes()).hexdigest() != reference['sha256']:
 raise ValueError('Approved Vietnamese reference changed')
ffmpeg = subprocess.check_output([str(ROOT / '.voxcpm-venv/bin/python'),'-c','import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],text=True).strip()
ref = WORK / 'approved-reference.wav'
subprocess.run([ffmpeg,'-v','error','-y','-i',str(source),'-ar','48000','-ac','1',str(ref)],check=True)
from vieneu import Vieneu
backbone = ROOT / proof['models'][0]['snapshot']
tts = Vieneu(backbone_repo=str(backbone),onnx_dir=str(backbone/'onnx_update'),backend='onnx',device='cpu',precision='fp32',threads=4,babble_retries=2)
with (WORK / 'samples.jsonl').open('a') as log:
 for index,text in enumerate(['hai','học','Tôi không muốn khiến bạn cảm thấy bị phớt lờ.']):
  start=time.monotonic()
  audio = tts.infer(text,ref_audio=str(ref),denoise=False,temperature=.8,apply_watermark=False)
  if not len(audio) or not np.isfinite(audio).all(): raise ValueError('Invalid candidate audio')
  peak=float(np.max(np.abs(audio)));gain=min(1,.95/max(.0001,peak))
  destination=WORK/f'candidate-{index}.wav'
  sf.write(destination,audio*gain,tts.sample_rate,subtype='PCM_16')
  row={'id':f'vieneu-candidate-{index}','language':'vi','voice':'female','sourceText':text,'spokenText':text,'file':destination.name,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'referenceSha256':reference['sha256'],'backend':'VieNeu-TTS-v3-Turbo','backendProvenanceSha256':hashlib.sha256((WORK/'model-provenance.json').read_bytes()).hexdigest(),'durationSeconds':len(audio)/tts.sample_rate,'elapsedSeconds':time.monotonic()-start,'normalTempo':1,'gain':gain,'approved':False}
  log.write(json.dumps(row,ensure_ascii=False)+'\n');log.flush();print(text,round(row['elapsedSeconds'],2),'seconds',flush=True)
