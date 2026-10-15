import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { instructionalAudioText } from '../app/instructional-audio-models.ts';

test('fragile isolated fragments reuse exact authored context without changing assessment text', async () => {
  const course = JSON.parse(await readFile(new URL('../audio/generated/ios-approved-v1/curriculum.json', import.meta.url), 'utf8')).lessons;
  for (const [language, fragment] of [['es','Llevo'], ['es','corregir'], ['es','haberte hablado'], ['vi','cách'], ['vi','sửa']]) {
    const context = instructionalAudioText(fragment, language);
    assert.notEqual(context, fragment);
    assert.ok(context.includes(fragment));
    assert.ok(course.some(l => context === (language === 'es' ? l.sentence.target : l.sentence.bridge) || l.vocabulary.some(w => context === (language === 'es' ? w.word : w.vietnamese))));
  }
  assert.equal(instructionalAudioText('eres', 'es'), 'eres');
  assert.equal(instructionalAudioText('de', 'es'), 'de');
  assert.equal(instructionalAudioText('từ / của', 'vi'), 'từ / của');
  assert.equal(instructionalAudioText('Llevo', 'en'), 'Llevo');
});
