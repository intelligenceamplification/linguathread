"""Prepare an existing bounded batch for checks/listening. No synthesis or publication."""
import argparse
import datetime as dt
import hashlib
import html
import json
from pathlib import Path
import sqlite3
from zoneinfo import ZoneInfo
from audio_pipeline import ROOT, WORK, read, save


def prepare(plan_path, date):
    plan = read(plan_path)
    stamp = date.replace('-', '')
    clips = []
    for task in plan['tasks']:
        receipt_path = WORK / (task['key'] + '.json')
        if not receipt_path.exists():
            continue
        receipt = read(receipt_path)
        path = WORK / receipt['file']
        if receipt['task'] != task or hashlib.sha256(path.read_bytes()).hexdigest() != receipt['sha256']:
            raise ValueError('Candidate identity or bytes changed')
        clips.append(dict(requestKey=task['key'], language=task['language'], voice=task['role'], text=task['displayText'], file=str(path), sha256=receipt['sha256'], technicalCheck=receipt['technicalCheck'], published=False,
                          requestedStyle=task['request']['settings'].get('style', '')))
    checks = {}
    for language in ('es', 'vi'):
        metadata = [dict(id=c['requestKey'], file=Path(c['file']).name, sha256=c['sha256'], language=language, voice=c['voice'], sourceText=c['text'], spokenText=next(t['request']['text'] for t in plan['tasks'] if t['key'] == c['requestKey'])) for c in clips if c['language'] == language]
        (WORK / f'{stamp}-{language}-metadata.jsonl').write_text(''.join(json.dumps(c, ensure_ascii=False) + '\n' for c in metadata))
        audit = WORK / f'{stamp}-{language}-audit.jsonl'
        if audit.exists():
            for line in audit.read_text().splitlines():
                row = json.loads(line); checks[row['sha256']] = row
    for clip in clips:
        clip['automatedCheck'] = checks.get(clip['sha256'])
        clip['status'] = (clip['automatedCheck'] or {}).get('status', 'not-screened')
        clip['requiresPronunciationReview'] = True
    if len(clips) != len(plan['tasks']):
        return dict(generated=len(clips), expected=len(plan['tasks']), metadataReady=True, reviewPageReady=False)
    day = dt.date.fromisoformat(date)
    start = dt.datetime.combine(day, dt.time(), ZoneInfo('America/Los_Angeles')).timestamp()
    end = dt.datetime.combine(day + dt.timedelta(days=1), dt.time(), ZoneInfo('America/Los_Angeles')).timestamp()
    with sqlite3.connect(WORK / 'registry.sqlite3') as db:
        requests = db.execute('SELECT COUNT(*) FROM attempts WHERE provider=? AND created>=? AND created<?', (plan['provider'], start, end)).fetchone()[0]
    report = dict(date=date, requestsUsed=requests, freeDailyCap=10, generated=len(clips), publishedClips=0, pronunciationReviewed=False, clips=clips)
    save(ROOT / f'outputs/audio-batch-{stamp}.json', report)
    esc = html.escape
    parts = ['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nuevo Flow · Audio review</title><style>body{font:17px system-ui;max-width:780px;margin:32px auto;padding:24px;line-height:1.6;color:#101315;background:white}article{padding:24px 0;border-bottom:1px solid #c3cbd1}audio{width:100%}small{color:#68737c}h1{font:40px Georgia}h2{font-size:20px}</style><h1>Spanish & Vietnamese</h1>', f'<p>{esc(date)} · {len(clips)} new lesson recordings. None has replaced app audio. Male and female renditions share existing lesson content; they do not create duplicate lessons.</p><p>Vietnamese generation targets the accepted Northern accent. Please judge the clarity and pronunciation of each exact recording. Transcript and pace checks cannot certify pronunciation or dialect.</p>']
    for index, clip in enumerate(clips, 1):
        audit = clip['automatedCheck'] or {}
        parts.append(f'<article><h2>{index}. {"Spanish" if clip["language"] == "es" else "Vietnamese"} · {esc(clip["voice"])}</h2><p>{esc(clip["text"])}</p><audio controls preload="none" src="{esc(Path(clip["file"]).as_uri(), quote=True)}"></audio><p><label>Playback speed <select onchange="this.closest(\'article\').querySelector(\'audio\').playbackRate=Number(this.value)"><option value="1">Normal</option><option value="0.75">Slow</option></select></label></p><small>Screening: {esc(clip["status"])} · Listening approval required</small><details><summary>Transcript and pace checks</summary><p>{esc(audit.get("transcript", "Pending"))}</p><small>{audit.get("tokensPerSecond", 0):.2f} tokens/second · flags: {esc(str(audit.get("flags", [])))}</small></details></article>')
    path = ROOT / f'outputs/audio-batch-{stamp}.html'
    path.write_text(''.join(parts) + '</html>')
    return dict(generated=len(clips), automatedPasses=sum(c['status'] == 'automated-pass' for c in clips), reviewPageReady=True, path=str(path), published=0)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--date', required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.plan, args.date)))
