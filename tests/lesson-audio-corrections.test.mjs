import assert from 'node:assert/strict';
import test from 'node:test';
import { correctLessonAudioText } from '../app/lesson-audio-corrections.ts';

test('audio corrections preserve the course and replace only two erroneous English vocabulary labels', () => {
  const lessons = [
    { id: 'unchanged', sentence: { target: 'Soy de Indiana.' }, vocabulary: [{ word: 'Soy', english: 'I am' }] },
    { id: 'a2-u18-1-acknowledging-harm-lesson', sentence: { target: 'Siento haberte hablado de esa manera.' }, vocabulary: [{ word: 'repair intention' }] },
    { id: 'a2-u18-2-clarifying-intention-lesson', sentence: { target: 'No quería hacerte sentir ignorado.' }, vocabulary: [{ word: 'intention contrast' }] },
  ];
  const before = structuredClone(lessons);
  const corrected = correctLessonAudioText(lessons);
  assert.deepEqual(lessons, before);
  assert.equal(corrected.length, lessons.length);
  assert.deepEqual(corrected.map(l => l.id), lessons.map(l => l.id));
  assert.deepEqual(corrected.map(l => l.sentence), lessons.map(l => l.sentence));
  assert.equal(corrected.filter((l, i) => l !== lessons[i]).length, 2);
  for (const [id, word] of [['a2-u18-1-acknowledging-harm-lesson', 'manera'], ['a2-u18-2-clarifying-intention-lesson', 'quería']]) {
    const lesson = corrected.find(l => l.id === id);
    assert.equal(lesson.vocabulary.at(-1).word, word);
    assert.ok(lesson.sentence.target.includes(word));
  }
  assert.deepEqual(correctLessonAudioText(corrected), corrected);
});

test('offline cached lessons get the same text corrections without losing their revision or IDs', async () => {
  const { readFile } = await import('node:fs/promises');
  const { default: ts } = await import('typescript');
  const vm = await import('node:vm');
  const lesson = { id: 'a2-u18-1-acknowledging-harm-lesson', title: 'Acknowledging harm', sentence: { target: 'Siento haberte hablado de esa manera.' }, vocabulary: ['repair intention', 'Siento', 'hablado', 'esa'].map(word => ({ word, english: 'meaning', vietnamese: 'nghĩa' })), mastery: { accepted: ['Siento haberte hablado de esa manera.'] } };
  const cached = { revision: 42, source: 'published', savedAt: '2026-10-14', lessons: [lesson] };
  function request(result) { const value = { result }; queueMicrotask(() => value.onsuccess()); return value; }
  const database = { transaction: () => ({ objectStore: () => ({ get: () => request(cached) }) }), close() {} };
  const indexedDB = { open: () => request(database) };
  const source = await readFile(new URL('../app/curriculum-cache.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: () => ({ correctLessonAudioText }), window: { indexedDB }, indexedDB, fetch: async () => { throw new Error('offline'); }, Promise, Date });
  const result = await module.exports.loadCurriculum([]);
  assert.equal(result.source, 'cache');
  assert.equal(result.revision, 42);
  assert.equal(result.lessons[0].id, lesson.id);
  assert.equal(result.lessons[0].vocabulary[0].word, 'manera');
  assert.equal(cached.lessons[0].vocabulary[0].word, 'repair intention');
});
