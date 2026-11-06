"""Plan at most 20 review clips: Gemini for queued defects, local for new coverage.

Planning is offline. Existing plans are immutable checkpoints; no audio is published.
"""
import argparse,datetime as dt,json,sqlite3
from pathlib import Path
from zoneinfo import ZoneInfo
from audio_pipeline import ROOT,WORK,read,save,canonical,digest,existing,spoken

def build(date,total=20,batch_index=1):
    if not 1<=total<=20:raise ValueError('Listening batches are capped at 20 clips')
    if not 1<=batch_index<=999:raise ValueError('Batch index must be between 1 and 999')
    day=dt.date.fromisoformat(date);stamp=date.replace('-','');suffix='' if batch_index==1 else f'-{batch_index:02d}'
    out=ROOT/'audio/generated'/('review-'+stamp+suffix);destination=out/'plan.json'
    if destination.exists():
        saved=read(destination)
        count=len(saved['localTasks'])+len(read(Path(saved['cloudPlan']))['tasks'])
        if count!=total or count>20:raise ValueError('Existing checkpoint has another size; choose a new batch index')
        return saved
    queue=read(ROOT/'audio/pending-pronunciation-repairs.json')
    pending=[r for r in queue['priorityItems'] if r['status']=='awaiting-next-free-quota-and-audition']
    start=dt.datetime.combine(day,dt.time(),ZoneInfo('America/Los_Angeles')).timestamp()
    end=dt.datetime.combine(day+dt.timedelta(days=1),dt.time(),ZoneInfo('America/Los_Angeles')).timestamp()
    with sqlite3.connect(WORK/'registry.sqlite3') as db:
        used=db.execute('SELECT COUNT(*) FROM attempts WHERE provider=? AND created>=? AND created<?',('gemini',start,end)).fetchone()[0]
    cloud=[];model=read(ROOT/'audio/cloud-audio-candidates.json')['providers']['gemini']['model']
    for item in pending[:min(total,max(0,10-used))]:
        language=item['language']
        if language=='en':
            style='Native American English female voice; calm, clear teacher delivery. Say the exact sentence once. The final word is singular fruit, pronounced /fruːt/, with no final s sound. Do not speak these instructions.'
            locale='en-US';accent='American'
        elif language=='vi':
            style='Native Southern Vietnamese (Saigon accent), female voice. Calm, clear, measured teacher delivery. Say the exact sentence once, articulating both occurrences of tôi distinctly, especially the second tôi after nhưng. Do not speak these instructions.'
            locale='vi-VN';accent='Southern'
        else:raise ValueError('Add an explicit accepted repair recipe for this language first')
        identity=dict(provider='gemini',model=model,voice='Kore',locale=locale,text=spoken(item['text']),settings={'style':style},normalizerVersion=1)
        cloud.append(dict(key=digest(canonical(identity).encode()),request=identity,displayText=item['text'],language=language,role='female',accent=accent,purpose='queued-pronunciation-repair',voiceCandidate=True,reuseSha256=None))
    cloudbody=dict(schemaVersion=1,kind='lesson-candidates',provider='gemini',scope=date+'-queued-defects-only',tasks=cloud)
    cloudplan=dict(cloudbody,id=digest(canonical(cloudbody).encode()),generationRequests=len(cloud),estimatedCharacters=sum(len(t['request']['text'])+len(t['request']['settings']['style']) for t in cloud),nextOffset=None)
    cloudpath=WORK/'plans'/('repairs-'+stamp+suffix+'.json');save(cloudpath,cloudplan)
    _,public,_,usable=existing();covered={(r['language'],r['normalizedText']) for r in usable+public['clips']}
    covered.update((r['language'],r['text']) for r in queue['priorityItems'] if r['status']!='resolved')
    for prior in (ROOT/'audio/generated').glob('review-*/metadata.jsonl'):
        for line in prior.read_text().splitlines():
            row=json.loads(line);file=prior.parent/row['file']
            if file.exists() and digest(file.read_bytes())==row['sha256']:covered.add((row['language'],row['sourceText']))
    inventory=read(ROOT/'outputs/launch-audio-inventory.json')['items'];config=read(ROOT/'audio/local-voice-profiles.json');profiles={p['id']:p for p in config['profiles']}
    remaining=total-len(cloud);vi_count=(remaining*2//3)//4*4
    tasks=[]
    for language,count,cycle in [('vi',vi_count,config['vietnameseCycle']),('en',remaining-vi_count,config['englishCycle'])]:
        candidates=[i for i in inventory if i['language']==language and (language,i['text']) not in covered and any(s.endswith(':sentence') for s in i['sources'])]
        if len(candidates)<count:raise ValueError('Not enough uncovered main lesson texts')
        for index,item in enumerate(candidates[:count]):
            profile=profiles[cycle[index%len(cycle)]]
            if not profile.get('generationEnabled',True):raise ValueError('Retired voice selected')
            identity=dict(language=language,spokenText=spoken(item['text']),profile=profile)
            tasks.append(dict(id=digest(canonical(identity).encode()),language=language,sourceText=item['text'],spokenText=spoken(item['text']),profile=profile,sources=item['sources']))
    assert len(tasks)+len(cloud)==total
    result=dict(schemaVersion=1,date=date,batchIndex=batch_index,reviewCap=20,localTasks=tasks,cloudPlan=str(cloudpath),requestsPreviouslyUsed=used,freeRequestsReserved=10-used-len(cloud),published=False)
    save(destination,result);return result

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--date',required=True);parser.add_argument('--total',type=int,default=20);parser.add_argument('--batch-index',type=int,default=1);args=parser.parse_args()
    p=build(args.date,args.total,args.batch_index);print(canonical(dict(localClips=len(p['localTasks']),cloudClips=read(Path(p['cloudPlan']))['generationRequests'],freeRequestsReserved=p['freeRequestsReserved'],date=p['date'])))
