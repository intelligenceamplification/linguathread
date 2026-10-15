"""Resumable same-reference Vietnamese candidates; synthesis never grants review."""
import argparse
import hashlib
import json
import re
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROOF = ROOT / 'audio/vietnamese-recipe-v1.json'
BACKEND = 'VieNeu-TTS-v3-Turbo'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--inventory', type=Path, required=True)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--context-carrier', action='store_true', help='Create held parent sentences for separate word extraction')
    parser.add_argument('--attempt', type=int, choices=(1, 2, 3), default=1)
    parser.add_argument('--temperature', type=float, choices=(.3, .5, .8), default=.8)
    parser.add_argument('--limit', type=int, default=100)
    args = parser.parse_args()
    args.output = args.output or ROOT / ('audio/generated/ios-vieneu-context-parents' if args.context_carrier else 'audio/generated/ios-vieneu-v1')
    if args.limit < 1:
        parser.error('Positive limit required')
    import numpy as np
    import soundfile as sf
    from vieneu import Vieneu
    proof = json.loads(PROOF.read_text())
    for model in proof['models']:
        for name, digest in model['files'].items():
            if hashlib.sha256((ROOT / model['snapshot'] / name).read_bytes()).hexdigest() != digest:
                raise ValueError('Pinned model bytes changed')
    registry = json.loads((ROOT / 'audio/voice-registry.json').read_text())
    voice = next(v for v in registry['voices'] if v['language'] == 'vi' and v['voice'] == 'female')
    reference = voice['sourceReference']
    accepted = next(v for v in voice.get('acceptedCandidateBackends', []) if v['backend'] == BACKEND and v['referenceSha256'] == reference['sha256'])
    reviews = json.loads((ROOT / 'audio/listening-reviews-ios-v1.json').read_text())['reviews']
    if not any(v['sha256'] == accepted['acceptanceClipSha256'] and v['approved'] for v in reviews):
        raise ValueError('Backend acceptance missing')
    source = ROOT / 'public' / reference['url'].lstrip('/')
    if hashlib.sha256(source.read_bytes()).hexdigest() != reference['sha256']:
        raise ValueError('Approved reference changed')
    args.output.mkdir(parents=True, exist_ok=True)
    ref = args.output / 'approved-reference.wav'
    ffmpeg = subprocess.check_output([str(ROOT / '.voxcpm-venv/bin/python'), '-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], text=True).strip()
    subprocess.run([ffmpeg, '-v', 'error', '-y', '-i', str(source), '-ar', '48000', '-ac', '1', str(ref)], check=True)
    backbone = ROOT / proof['models'][0]['snapshot']
    tts = Vieneu(backbone_repo=str(backbone), onnx_dir=str(backbone/'onnx_update'), backend='onnx', device='cpu', precision='fp32', threads=4, babble_retries=2)
    metadata = args.output / 'metadata.jsonl'
    saved = list(map(json.loads, metadata.read_text().splitlines())) if metadata.exists() else []
    known = {v['generationSignature'] for v in saved if (args.output / v['file']).is_file() and hashlib.sha256((args.output / v['file']).read_bytes()).hexdigest() == v['sha256']}
    count = 0
    with metadata.open('a') as log:
        for item in json.loads(args.inventory.read_text())['items']:
            if item['language'] != 'vi':
                continue
            target = item['text']
            if args.context_carrier and (len(target.split()) > 3 or re.search(r'[/／·]', target)):
                continue
            text = 'Hôm nay tôi học cách nói từ ' + target + ' thật rõ.' if args.context_carrier else target
            recipe = [text, reference['sha256'], hashlib.sha256(PROOF.read_bytes()).hexdigest(), args.attempt]
            if args.temperature != .8:
                recipe.append({'temperature': args.temperature})
            signature = hashlib.sha256(json.dumps(recipe, ensure_ascii=False).encode()).hexdigest()
            if signature in known:
                continue
            start = time.monotonic()
            # Display separators never enter the synthesizer. Variants retain
            # their written form and are spoken separately with a short pause.
            parts = [p.strip() for p in re.split(r'[/／·]', text) if p.strip()]
            if not parts:
                raise ValueError('No spoken content')
            pieces = []
            for part in parts:
                if pieces:
                    pieces.append(np.zeros(round(tts.sample_rate*.4)))
                pieces.append(tts.infer(part, ref_audio=str(ref), denoise=False, temperature=args.temperature, apply_watermark=False))
            audio = np.concatenate(pieces)
            if not len(audio) or not np.isfinite(audio).all():
                raise ValueError('Invalid generated signal')
            gain = min(1, .95/max(.0001, float(np.max(np.abs(audio)))))
            source_recording = args.output / (signature + '.wav')
            sf.write(source_recording, audio*gain, tts.sample_rate, subtype='PCM_16')
            destination = args.output / (signature + '.m4a')
            subprocess.run([ffmpeg, '-v', 'error', '-y', '-i', str(source_recording), '-c:a', 'aac', '-b:a', '128k', '-ac', '1', '-movflags', '+faststart', str(destination)], check=True)
            row = dict(id='vieneu-'+signature[:20], language='vi', voice='female', sourceText=text, spokenText=' '.join(parts), file=destination.name, sha256=hashlib.sha256(destination.read_bytes()).hexdigest(), sourceRecording=source_recording.name, sourceRecordingSha256=hashlib.sha256(source_recording.read_bytes()).hexdigest(), outputCodec='aac-128k-mono', referenceSha256=reference['sha256'], backend=BACKEND, backendProvenanceSha256=hashlib.sha256(PROOF.read_bytes()).hexdigest(), generationSignature=signature, candidateAttempt=args.attempt, temperature=args.temperature, durationSeconds=len(audio)/tts.sample_rate, elapsedSeconds=time.monotonic()-start, normalTempo=1, gain=gain, qualityCheck={'status':'pending-audit'})
            if args.context_carrier:
                row['extractionTarget'] = target
                row['candidateRole'] = 'context-parent'
            elif item.get('extractionTarget'):
                row['extractionTarget'] = item['extractionTarget']
                row['extractionWordOffset'] = item['extractionWordOffset']
                row['candidateRole'] = 'context-parent'
            log.write(json.dumps(row, ensure_ascii=False)+'\n'); log.flush()
            print(text, round(row['elapsedSeconds'], 2), 'seconds', flush=True)
            count += 1
            if count >= args.limit:
                break


if __name__ == '__main__':
    main()
