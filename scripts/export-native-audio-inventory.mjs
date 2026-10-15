// Read the same authored models used by the iPhone's hosted lesson runtime.
import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const modules=new Map(), sources=new Map();
async function load(url){
 if(modules.has(url.href))return modules.get(url.href);
 const source=await readFile(url,'utf8');sources.set(url.pathname,createHash('sha256').update(source).digest('hex'));
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const dependencies={};for(const match of output.matchAll(/require\("(\.[^"]+)"\)/g))dependencies[match[1]]=await load(new URL(`${match[1]}.ts`,url));
 const module={exports:{}};vm.runInNewContext(output,{module,exports:module.exports,require:id=>dependencies[id],Date,Set,Map,Intl,URL,console});modules.set(url.href,module.exports);return module.exports;
}
const {curriculum:bundled,sentenceAnatomyForLesson}=await load(new URL('../app/curriculum.ts',import.meta.url));
const publishedPath=process.argv[2];
if(!publishedPath)throw new Error('Provide the current published curriculum JSON; the bundled subset cannot establish full coverage.');
const publishedBytes=await readFile(publishedPath,'utf8');const published=JSON.parse(publishedBytes);
if(published.source!=='published'||!Array.isArray(published.lessons)||published.lessons.length<bundled.length)throw new Error('Expected complete published authored curriculum.');
const {correctLessonAudioText}=await load(new URL('../app/lesson-audio-corrections.ts',import.meta.url));
const curriculum=correctLessonAudioText(published.lessons);
const {writingAnswerLanguage}=await load(new URL('../app/writing-system/model.ts',import.meta.url));
const {writingCourses}=await load(new URL('../app/writing-system/curriculum.ts',import.meta.url));
const {scriptCourses}=await load(new URL('../app/script-courses.ts',import.meta.url));
const {foundationContent}=await load(new URL('../app/multilingual-foundation.ts',import.meta.url));
const {createDailyLessonPlan}=await load(new URL('../app/lesson-tools.ts',import.meta.url));
const {scriptAudioText}=await load(new URL('../app/script-course-engine.ts',import.meta.url));
const {instructionalAudioText}=await load(new URL('../app/instructional-audio-models.ts',import.meta.url));
const output=new URL('../audio/inventory-es-vi.json',import.meta.url);
const previous=JSON.parse(await readFile(output,'utf8'));const items=new Map();
const previousIDs=new Map(previous.items.map(item=>[`${item.language}\0${item.text}`,item.id]));
function add(language,text,source){
 if(!['es','vi'].includes(language)||typeof text!=='string'||!text.trim())return;
 text=instructionalAudioText(text,language);
 text=text.normalize('NFC').trim().replace(/\s+/g,' ');const key=`${language}\0${text}`;
 const item=items.get(key)||{id:previousIDs.get(key)||`${language}-${createHash('sha256').update(key).digest('hex').slice(0,16)}`,language,text,sources:[]};
 if(!item.sources.includes(source))item.sources.push(source);items.set(key,item);
}
// Enumerate actual Listen controls, including their dynamically generated prompts.
// Do not synthesize every possible X-Ray word grouping when it has no audio control.
const code={Spanish:'es',Vietnamese:'vi'};
for(const lesson of curriculum){
 add('es',lesson.sentence.target,`${lesson.id}:sentence`);add('vi',lesson.sentence.bridge,`${lesson.id}:sentence`);
 add('es',lesson.transform.answer,`${lesson.id}:transform`);add('es',lesson.mastery.answer,`${lesson.id}:mastery`);add('vi',lesson.bridgeMastery.answer,`${lesson.id}:bridge-mastery`);
 for(const word of lesson.vocabulary){add('es',word.word,`${lesson.id}:vocabulary`);add('vi',word.vietnamese,`${lesson.id}:vocabulary`);}
 for(const realization of sentenceAnatomyForLesson(lesson).realizations)add(code[realization.language],realization.sentence,`${lesson.id}:anatomy`);
 for(let day=0;day<7;day++)for(const exercise of createDailyLessonPlan(curriculum,lesson,[],[],day).exercises){add(code[exercise.from],exercise.prompt,`${lesson.id}:daily-phrase`);add(code[exercise.to],exercise.answer,`${lesson.id}:daily-phrase`);}
}
for(const language of ['es','vi']){
 for(const [objective,content] of Object.entries(foundationContent[language]))add(language,content.text,`foundation:${objective}`);
 for(const unit of scriptCourses[language].lessons){add(language,unit.example,`${unit.id}:example`);add(language,scriptAudioText(unit),`${unit.id}:answer`);add(language,scriptAudioText(unit),`${unit.id}:choice-audio`);}
 for(const unit of writingCourses[language].units){
  add(language,unit.example,`${unit.id}:example`);
  for(const exercise of unit.exercises){
   if(exercise.kind!=='audio-choice')add(language,exercise.cue,`${exercise.id}:cue`);add(language,exercise.audio,`${exercise.id}:exercise-audio`);
   if(exercise.direction!=='meaning')add(writingAnswerLanguage(exercise,language),exercise.answerAudio||exercise.answer,`${exercise.id}:answer`);
   if(exercise.kind==='audio-choice')for(const choice of exercise.choices||[])add(language,exercise.choiceAudio?.[choice]||choice,`${exercise.id}:choice-audio`);
  }
 }
}
const sourceHashes=Object.fromEntries([...sources].map(([path,hash])=>[path.slice(new URL('../',import.meta.url).pathname.length),hash]));
for(const file of ['app/page.tsx','app/daily-lesson.tsx','app/sentence-anatomy.tsx','app/writing-system/view.tsx','app/multilingual-preview/readiness.tsx','app/multilingual-preview/script-course-view.tsx','app/multilingual-preview/preview-client.tsx'])sourceHashes[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
await writeFile(output,JSON.stringify({generatedAt:new Date().toISOString(),sourceLessonCount:curriculum.length,publishedRevision:published.revision,publishedCurriculumSha256:createHash('sha256').update(publishedBytes).digest('hex'),sourceHashes,items:[...items.values()]},null,2)+'\n');
console.log(JSON.stringify({lessons:curriculum.length,previousTexts:previous.items.length,currentTexts:items.size,addedTexts:items.size-previous.items.length}));
