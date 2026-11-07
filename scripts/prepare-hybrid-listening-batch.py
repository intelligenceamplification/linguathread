"""Prepare the bounded hybrid review without approving or publishing any clip."""
import datetime,html,json,os
from pathlib import Path
from audio_pipeline import ROOT,WORK,canonical,digest,read,save

OUT=ROOT/'audio/generated'/os.environ.get('AUDIO_LOCAL_BATCH','review-'+datetime.date.today().strftime('%Y%m%d'))
STEM=os.environ.get('AUDIO_REVIEW_STEM','audio-review-'+datetime.date.today().strftime('%Y%m%d'))
plan=read(OUT/'plan.json');date=plan['date'];stamp=date.replace('-','')
rows=[json.loads(l) for l in (OUT/'metadata.jsonl').read_text().splitlines()]
checks={}
for path in [OUT/'vi-audit.jsonl',OUT/'en-audit.jsonl',OUT/'es-audit.jsonl',*[WORK/(stamp+'-'+language+'-audit.jsonl') for language in ['en','es','vi']]]:
    if path.exists():
        for line in path.read_text().splitlines():
            row=json.loads(line);checks[row['sha256']]=row
clips=[]
for row in rows:
    profile=row['profile']
    clips.append(dict(id=row['id'],language=row['language'],text=row['sourceText'],voice=profile['gender'],profile=profile['id'],label=f"{profile['accent']} · {profile['gender']}",file=str(OUT/row['file']),sha256=row['sha256'],elapsedSeconds=row['elapsedSeconds'],originalClipNumber=row.get('originalClipNumber')))
cloud_path=read(OUT/'plan.json').get('cloudPlan')
cloud=read(Path(cloud_path)) if cloud_path else {'tasks':[]}
for task in cloud['tasks']:
    receipt=WORK/(task['key']+'.json')
    if not receipt.exists():continue
    row=read(receipt)
    if row['task']!=task or digest(canonical(task['request']).encode())!=task['key'] or row['file']!=row['sha256']+'.wav':raise ValueError('Cloud recording identity differs from its displayed text')
    clips.append(dict(id=task['key'],language=task['language'],text=task['displayText'],voice=task['role'],profile='gemini-'+task['language']+'-'+task['role'],label=' · '.join(filter(None,['Gemini',task.get('accent'),task['role'],'new voice candidate' if task.get('voiceCandidate') else None])),file=str(WORK/row['file']),sha256=row['sha256'],voiceCandidate=task.get('voiceCandidate',False),purpose=task.get('purpose','lesson-recording'),originalClipNumber=task.get('originalClipNumber')))
if OUT.name.startswith('review-'):
    if len(plan['localTasks'])+len(cloud['tasks'])>20:raise ValueError('Review batch exceeds 20 clips')
    clips.sort(key=lambda c:0 if c['profile'].startswith('gemini-') else 1)
for clip in clips:
    assert digest(Path(clip['file']).read_bytes())==clip['sha256']
    clip['screen']=checks.get(clip['sha256'],{'status':'not-screened','flags':['screening-pending']})
    clip['published']=False
samples=[]
for profile in dict.fromkeys(c['profile'] for c in clips):
    candidates=[c for c in clips if c['profile']==profile and c['screen']['status']=='automated-pass']
    if candidates:samples.append(max(candidates,key=lambda c:len(c['text']))['id'])
if OUT.name.endswith('-repairs'):
    samples += [c['id'] for c in clips if c['language']=='vi' and c['screen']['status']=='automated-pass' and c['id'] not in samples]
for i,c in enumerate(clips,1):c['number']=i;c['suggestedSample']=c['id'] in samples
planned=len(plan['localTasks'])+len(cloud['tasks'])
unavailable=[dict(language=t['language'],text=t['displayText'],requestKey=t['key']) for t in cloud['tasks'] if not (WORK/(t['key']+'.json')).exists()]
summary=dict(planned=planned,incomplete=planned-len(clips),generated=len(clips),automatedPasses=sum(c['screen']['status']=='automated-pass' for c in clips),held=sum(c['screen']['status']!='automated-pass' for c in clips),localClips=len(rows),cloudClips=len(clips)-len(rows),published=0)
report=dict(date=date,summary=summary,samples=samples,clips=clips,unavailable=unavailable)
save(ROOT/('outputs/'+STEM+'.json'),report)
e=html.escape
parts=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nuevo Flow · Hybrid lesson audio</title><style>body{font:17px system-ui;max-width:780px;margin:30px auto;padding:24px;color:#11171b;line-height:1.6}h1{font:38px Georgia}h2{font-size:21px}article{padding:24px 0;border-bottom:1px solid #ccd1d5}audio{width:100%}.held{border-left:3px solid #ac6634;padding-left:16px}small{color:#58636c}button,select{font:inherit;padding:6px}a{color:inherit}</style><h1>New lesson recordings</h1>',f'<p>{summary["generated"]} candidates: {summary["localClips"]} local and {summary["cloudClips"]} Gemini. {summary["automatedPasses"]} screen passes; {summary["held"]} held. Nothing is published.</p><p>Suggested samples cover every voice. Held clips need individual review and are excluded from any batch approval. Screening cannot establish authentic pronunciation.</p>']
heading=f"Audio review · {date}"+(f" · Batch {plan['batchIndex']}" if plan.get('batchIndex') else '')
parts[0]=parts[0].replace('<h1>New lesson recordings</h1>',f'<h1>{e(heading)}</h1>')
if OUT.name.startswith('review-'):
    available_cloud=[t for t in cloud['tasks'] if (WORK/(t['key']+'.json')).exists()]
    repair_count=sum(t.get('purpose')=='queued-pronunciation-repair' for t in available_cloud)
    notes=[]
    if repair_count:notes.append(f'The first {repair_count} clips are Gemini repair auditions.')
    if len(available_cloud)>repair_count:notes.append(f"{len(available_cloud)-repair_count} clips add new Gemini lesson coverage.")
    if rows:notes.append(f'{len(rows)} clips add new local lesson coverage.')
    repair_note=' '.join(notes)
    parts[-1]=parts[-1].replace('Suggested samples cover every voice. Held clips need individual review and are excluded from any batch approval.', 'Please listen to every recording. '+repair_note+' Nothing is approved automatically. Flagged clips need your judgment.')
if unavailable:
    parts.append(f'<p>{len(unavailable)} planned recordings are unavailable or held by the provider and are excluded from approval.</p><ul>'+''.join('<li>'+e(r['text'])+'</li>' for r in unavailable)+'</ul>')
groups=[('All recordings for individual listening review',clips)] if len(clips)<=20 else [('Suggested voice samples',[c for c in clips if c['suggestedSample']]),('Held for individual review',[c for c in clips if c['screen']['status']!='automated-pass']),('Other screened recordings',[c for c in clips if not c['suggestedSample'] and c['screen']['status']=='automated-pass'])]
for heading,subset in groups:
    parts.append('<h1>'+heading+'</h1>')
    for c in subset:
        held=c['screen']['status']!='automated-pass'
        replacement = f"<p>Replacement for clip {c['originalClipNumber']}.</p>" if OUT.name.endswith('-repairs') and c.get('originalClipNumber') is not None else ''
        parts.append(f'<article class="{"held" if held else ""}"><h2>{c["number"]}. {c["language"].upper()} · {e(c["label"])}</h2>{replacement}<p>{e(c["text"])}</p><audio controls preload="none" src="{e(Path(c["file"]).as_uri(),quote=True)}"></audio><p><label>Speed <select onchange="this.closest(\'article\').querySelector(\'audio\').playbackRate=Number(this.value)"><option value="1">Normal</option><option value="0.75">Slow</option></select></label></p><small>{e(c["screen"]["status"])}</small><details><summary>Screening details</summary><p>{e(c["screen"].get("transcript","Pending"))}</p><p>{e(str(c["screen"].get("flags",[])))}</p></details></article>')
path=ROOT/('outputs/'+STEM+'.html');path.write_text(''.join(parts)+'</html>')
print(json.dumps(dict(summary,path=str(path)),ensure_ascii=False))
