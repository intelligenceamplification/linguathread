"""Vietnamese triage using the pinned original recognizer, never text prompting.

The converted int8 runtime produced trailing hallucinations on controlled clips;
use the original full-precision model and its no-timestamps generation mode.
This grants automated screening only, never pronunciation or listening review.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import zlib

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / 'audio/models/phowhisper-small'
REVISION = 'a86b604c346caf7148c37512eafe783a16420adb'
MODEL_ID = f'vinai/PhoWhisper-small@{REVISION}:transformers-fp32-no-timestamps-v1'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--metadata', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    proof = json.loads((MODEL / 'provenance.json').read_text())
    if proof['repo'] != 'vinai/PhoWhisper-small' or proof['revision'] != REVISION:
        raise ValueError('Unexpected original recognition model')
    for name, digest in proof['files'].items():
        if Path(name).name != name or hashlib.sha256((MODEL / name).read_bytes()).hexdigest() != digest:
            raise ValueError('Original recognition checkpoint changed')
    spec = importlib.util.spec_from_file_location('quality', ROOT / 'scripts/audit-voice-audio.py')
    quality = importlib.util.module_from_spec(spec); spec.loader.exec_module(quality)
    rows = list(map(json.loads, args.metadata.read_text().splitlines()))
    previous = list(map(json.loads, args.output.read_text().splitlines())) if args.output.exists() else []
    done = {r['sha256'] for r in previous if r.get('model') == MODEL_ID and r.get('auditVersion') == 2}
    rows = [r for r in rows if r['language'] == 'vi' and r['sha256'] not in done]
    if not rows:
        print('No unaudited original-model clips', flush=True); return
    import torch
    from transformers import WhisperProcessor, WhisperForConditionalGeneration
    from faster_whisper.audio import decode_audio
    torch.set_num_threads(4)
    processor = WhisperProcessor.from_pretrained(MODEL, local_files_only=True)
    model = WhisperForConditionalGeneration.from_pretrained(MODEL, local_files_only=True).eval()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('a') as log:
        for index, row in enumerate(rows, 1):
            source = args.metadata.parent / row['file']
            if hashlib.sha256(source.read_bytes()).hexdigest() != row['sha256']:
                raise ValueError('Audio bytes changed')
            audio = decode_audio(str(source), sampling_rate=16000)
            features = processor(audio, sampling_rate=16000, return_tensors='pt')
            with torch.inference_mode():
                generated = model.generate(features.input_features, language='vi', task='transcribe', return_timestamps=False, max_new_tokens=192, return_dict_in_generate=True, output_scores=True)
                scores = model.compute_transition_scores(generated.sequences, generated.scores, normalize_logits=True)
            transcript = processor.batch_decode(generated.sequences, skip_special_tokens=True)[0]
            confidence = float(scores.mean()) if scores.numel() else -100.0
            expected = row.get('spokenText') or row['sourceText']
            target, heard = quality.normalize(expected, 'vi'), quality.normalize(transcript, 'vi')
            words = target.split(); duration = quality.active_speech_span(audio)
            pace = len(words) / max(duration, .1)
            encoded = transcript.encode()
            compression = len(encoded) / max(1, len(zlib.compress(encoded)))
            flags = []
            if not transcript or confidence < -1 or duration == 0:
                flags.append('uncertain-speech')
            if compression > 2.4:
                flags.append('repetition-risk')
            if target != heard:
                flags.append('text-mismatch')
            if len(words) >= 4 and pace > 5:
                flags.append('fast-speech')
            if len(generated.scores) >= 192:
                flags.append('generation-limit')
            check = dict(id=row['id'], sha256=row['sha256'], model=MODEL_ID, auditVersion=2, language='vi', expected=expected, transcript=transcript, wordErrorRate=quality.distance(words, heard.split())/max(1,len(words)), characterErrorRate=quality.distance(target,heard)/max(1,len(target)), tokensPerSecond=pace, minimumSpeechConfidence=confidence, compressionRatio=compression, paceMethod='energy-active-span-v1', speechSeconds=duration, flags=flags, status='needs-review' if flags else 'automated-pass')
            log.write(json.dumps(check, ensure_ascii=False)+'\n'); log.flush()
            print(f"{index}/{len(rows)} {expected}: {check['status']} {','.join(flags)}", flush=True)


if __name__ == '__main__':
    main()
