"""Extract words from independently checked same-voice carriers.

Forced alignment supplies timing only. The full parent must pass unprompted
recognition first, and each final crop needs another independent check.
No human listening approval is inherited from a parent or reference.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import wave

ROOT = Path(__file__).resolve().parents[1]


def load_module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / file)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def heard_target_index(check, target, normalize, language):
    """A carrier's unrelated prefix may differ; the requested words may not.

    Alignment then uses the unprompted transcript, never forced expected text.
    Each resulting standalone clip still needs its own independent audit.
    """
    if set(check.get('flags', [])) - {'text-mismatch'}:
        return None
    heard = normalize(check.get('transcript', ''), language).split()
    wanted = normalize(target, language).split()
    matches = [i for i in range(len(heard)-len(wanted)+1) if heard[i:i+len(wanted)] == wanted]
    return matches[0] if wanted and len(matches) == 1 else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--parents', type=Path, required=True)
    parser.add_argument('--language', choices=('es', 'vi'), default='vi')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--allow-target-only-parent', action='store_true', help='Allow an unrelated prefix mismatch only when unprompted ASR uniquely heard the exact target')
    args = parser.parse_args()
    args.output = args.output or ROOT / ("audio/generated/ios-vietnamese-context-fragments" if args.language == "vi" else "audio/generated/ios-spanish-context-fragments")
    quality = load_module('quality', 'audit-voice-audio.py')
    reference = load_module('reference', 'audit-native-vietnamese.py')
    crop = load_module('crop', 'extract-native-word-candidates.py')
    from faster_whisper import WhisperModel
    from faster_whisper.audio import decode_audio, pad_or_trim
    from faster_whisper.tokenizer import Tokenizer
    import imageio_ffmpeg
    model_path = ROOT / 'audio/models/phowhisper-small-ct2' if args.language == 'vi' else 'small'
    if args.language == 'vi':
        proof = json.loads((model_path / 'provenance.json').read_text())
        for name, digest in proof['files'].items():
            if Path(name).name != name or hashlib.sha256((model_path / name).read_bytes()).hexdigest() != digest:
                raise ValueError('Alignment model bytes changed')
    expected_model = reference.MODEL_ID if args.language == 'vi' else 'small'
    args.output.mkdir(parents=True, exist_ok=True)
    metadata = args.output / 'metadata.jsonl'
    saved = list(map(json.loads, metadata.read_text().splitlines())) if metadata.exists() else []
    known = {r['generationSignature'] for r in saved if (args.output / r['file']).is_file() and hashlib.sha256((args.output/r['file']).read_bytes()).hexdigest() == r['sha256']}
    model = WhisperModel(str(model_path), device='cpu', compute_type='int8', download_root=str(ROOT / 'audio/models'))
    tokenizer = Tokenizer(model.hf_tokenizer, model.model.is_multilingual, task="transcribe", language=args.language)
    rows = list(map(json.loads, (args.parents / 'metadata.jsonl').read_text().splitlines()))
    with metadata.open('a') as log:
        for parent in rows:
            check = parent.get('qualityCheck', {})
            if (not parent.get('extractionTarget') or check.get('model') != expected_model
                    or check.get('sha256') != parent.get('sha256') or check.get('auditVersion') != 2):
                continue
            full_parent_pass = check.get('status') == 'automated-pass' and not check.get('flags')
            heard_index = heard_target_index(check, parent['extractionTarget'], quality.normalize, args.language)
            if not full_parent_pass and not (args.allow_target_only_parent and heard_index is not None):
                continue
            source = args.parents / parent['file']
            if hashlib.sha256(source.read_bytes()).hexdigest() != parent['sha256']:
                raise ValueError('Checked parent bytes changed')
            target = parent['extractionTarget']
            alignment_text = parent['spokenText'] if full_parent_pass else check['transcript']
            expected = quality.normalize(alignment_text, args.language).split()
            target_words = quality.normalize(target, args.language).split()
            audio = decode_audio(str(source), sampling_rate=16000)
            features = model.feature_extractor(audio)
            frames = min(features.shape[-1], model.feature_extractor.nb_max_frames)
            encoder = model.encode(pad_or_trim(features))
            # Align independently verified text; never use forced text as a
            # content check. The final cropped bytes get unprompted ASR again.
            words = [word for word in model.find_alignment(tokenizer, [tokenizer.encode(alignment_text)], encoder, frames)[0] if quality.normalize(word['word'], args.language)]
            if [quality.normalize(w['word'], args.language) for w in words[:len(expected)]] != expected:
                continue
            index = parent.get("extractionWordOffset", 7) if full_parent_pass else heard_index
            if expected[index:index+len(target_words)] != target_words:
                raise ValueError('Carrier shape changed')
            last = index+len(target_words)-1
            start = max(words[index-1]['end'] if index else 0, words[index]['start']-.015)
            end = min(words[last+1]['start'] if last+1 < len(words) else len(audio)/16000, words[last]['end']+.015)
            if end-start < .08:
                continue
            signature = hashlib.sha256(f'checked-carrier-forced-crop-v2:{parent["sha256"]}:{start}:{end}:{target}'.encode()).hexdigest()
            if signature in known:
                continue
            destination = args.output / (signature+'.wav')
            crop.crop_checked_audio(imageio_ffmpeg.get_ffmpeg_exe(), source, destination, start, end)
            with wave.open(str(destination)) as audio:
                duration = audio.getnframes()/audio.getframerate()
            row = dict(id=args.language+'-carrier-'+signature[:20], language=args.language, voice=parent['voice'], sourceText=target, spokenText=target, file=destination.name, sha256=hashlib.sha256(destination.read_bytes()).hexdigest(), generationSignature=signature, sourceSha256=parent['sha256'], sourceTextForExtraction=parent['spokenText'], startSeconds=start, endSeconds=end, derivation='checked-parent-forced-word-crop-v2', durationSeconds=duration, backend=parent['backend'], backendProvenanceSha256=parent.get('backendProvenanceSha256'), recipeSha256=parent.get('recipeSha256'), referenceSha256=parent['referenceSha256'], normalTempo=parent['normalTempo'], qualityCheck={'status':'pending-audit'})
            row['parentQualityScope'] = 'complete-parent' if full_parent_pass else 'unprompted-target-only'
            row['alignmentText'] = alignment_text
            log.write(json.dumps(row, ensure_ascii=False)+'\n'); log.flush()
            print(target, round(duration, 3), flush=True)


if __name__ == '__main__':
    main()
