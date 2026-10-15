"""Compare a bounded held/control set; never approves or publishes audio."""
import hashlib
import json
from pathlib import Path
import subprocess
import numpy as np
import torch
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'audio/generated/vietnamese-recognition-benchmark'
WORK.mkdir(exist_ok=True)
model_path = ROOT / 'audio/models/phowhisper-small'
processor = AutoProcessor.from_pretrained(model_path, local_files_only=True)
model = AutoModelForSpeechSeq2Seq.from_pretrained(model_path, local_files_only=True).eval()
torch.set_num_threads(4)
source = ROOT / 'audio/generated/ios-vietnamese-v1'
rows = [json.loads(line) for line in (source / 'metadata.jsonl').read_text().splitlines()]
targets = ['đi','hai','người','cơ','học','ý tưởng','Tôi không muốn khiến bạn cảm thấy bị phớt lờ.','để','lời nói','trở nên tự nhiên']
selected = []
for text in targets:
 matches = [row for row in rows if row['sourceText'] == text]
 selected.extend(matches[-1:])
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
with (WORK / 'comparison.jsonl').open('w') as output:
 for row in selected:
  path = source / row['file']
  assert hashlib.sha256(path.read_bytes()).hexdigest() == row['sha256']
  audio = np.frombuffer(subprocess.check_output([ffmpeg,'-v','error','-i',str(path),'-ar','16000','-ac','1','-f','f32le','pipe:1']),dtype=np.float32)
  features = processor(audio,sampling_rate=16000,return_tensors='pt').input_features
  with torch.inference_mode():
   result = model.generate(features,language='vi',task='transcribe',max_new_tokens=128)
  transcript = processor.batch_decode(result,skip_special_tokens=True)[0]
  report = {'sourceText':row['sourceText'],'sha256':row['sha256'],'file':str(path.relative_to(ROOT)),'model':'vinai/PhoWhisper-small','modelRevision':json.loads((model_path/'provenance.json').read_text())['revision'],'transcript':transcript,'previousTranscript':row.get('qualityCheck',{}).get('transcript'),'previousFlags':row.get('qualityCheck',{}).get('flags'),'approvalsGranted':False}
  output.write(json.dumps(report,ensure_ascii=False)+'\n');output.flush()
  print(json.dumps(report,ensure_ascii=False),flush=True)
