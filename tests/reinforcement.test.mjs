import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as engine from '../app/learning-engine.ts';
const source = await readFile(new URL('../app/reinforcement.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(compiled, { module: mod, exports: mod.exports, require: () => engine, Date, Set, Array, encodeURIComponent });
const { flashcardCatalog, flashcardQueue, planFlashcards, recordFlashcardRating, listeningReviewQueue } = mod.exports;
const old = new Date('2026-10-20T12:00:00Z');
const now = new Date('2026-10-27T12:00:00Z');
const lesson = { id: 'a', objectiveId: 'a', level: 'A1', unit: 1, title: 'Origin', skill: 'ser + de', prerequisites: [], sentence: { anchor: 'I am from Indiana.', target: 'Soy de Indiana.', bridge: 'Tôi đến từ Indiana.' }, vocabulary: [{ word: 'soy', english: 'I am', vietnamese: 'tôi là', note: 'Identity.' }], grammar: { focus: 'ser + de', insight: 'Person and origin.' } };
const next = { ...lesson, id: 'b', objectiveId: 'b', title: 'Next' };
const production = { fromLanguage: 'English', toLanguage: 'Spanish', fromModality: 'meaning', toModality: 'written', retrievalType: 'production' };
const history = () => engine.recordEvidence(engine.emptyLearnerModel(), 'a', 'Spanish', true, false, old, production, 900, undefined, 'earlier');

test('cards use only encountered authored material and active languages', () => {
  assert.equal(flashcardCatalog([lesson], engine.emptyLearnerModel(), [], ['Spanish']).length, 0);
  const cards = flashcardCatalog([lesson, next], history(), [], ['Spanish', 'Vietnamese', 'French']);
  assert.equal(cards.length, 4);
  assert.ok(cards.every(c => c.lesson.id === 'a' && ['Spanish', 'Vietnamese'].includes(c.language)));
  assert.ok(cards.some(c => c.kind === 'Expression') && cards.some(c => c.kind === 'Vocabulary'));
  const first = cards[0];
  const rated = recordFlashcardRating(history(), first, true, 'one', 1200, now).model;
  assert.ok(flashcardCatalog([lesson], rated, ['a'], ['Spanish']).some(c => c.id === first.id && c.kind === 'Pattern'));
  assert.equal(new Set(cards.map(c => c.id)).size, cards.length);
  assert.equal(flashcardCatalog([lesson], history(), [], ['French']).length, 0);
});

test('daily selection is brief, excludes the current lesson and has no duplicate language/answer', () => {
  assert.equal(flashcardQueue([lesson], history(), ['a'], ['Spanish'], now, 'a').length, 0);
  const cards = planFlashcards(flashcardQueue([lesson], history(), ['a'], ['Spanish', 'Vietnamese'], now), 2);
  assert.equal(cards.length, 2);
  assert.equal(new Set(cards.map(c => c.language + c.answer)).size, 2);
  assert.equal(new Set(cards.map(c => c.language)).size, 2);
  assert.equal(flashcardQueue([lesson], history(), ['a'], ['Spanish'], new Date(old.getTime() + 60000)).length, 0);
});

test('Know it spaces cards without granting independent mastery, and Practice again resets spacing', () => {
  const card = flashcardCatalog([lesson], history(), ['a'], ['Spanish'])[0];
  let model = history();
  for (let index = 0; index < 4; index++) {
    const when = new Date(old.getTime() + index * 4 * 86400000);
    const result = recordFlashcardRating(model, card, true, 'rating-' + index, 1234, when);
    model = result.model;
    assert.equal(result.reviewDelayDays, [1, 3, 7, 14][index]);
  }
  const evidence = model.evidence[engine.edgeEvidenceKey(card.objectiveId, card.edge)];
  assert.equal(evidence.independentSuccesses, 0);
  assert.equal(evidence.independentReviewDays.length, 0);
  assert.equal(evidence.lastLatencyMs, 1234);
  assert.notEqual(engine.masteryState(evidence), 'stable');
  assert.equal(engine.isPhraseRetired(lesson, model), false);
  const failed = recordFlashcardRating(model, card, false, 'failure', 1900, now);
  assert.equal(failed.reviewDelayDays, 1);
  assert.equal(recordFlashcardRating(failed.model, card, true, 'relearn', 1000, now).reviewDelayDays, 1);
  assert.equal(engine.selectNextLesson([lesson, next], model, ['a'], now).lesson.id, 'b');
});

test('daily and focused practice read the exact same persisted due schedule', () => {
  const card = flashcardCatalog([lesson], history(), ['a'], ['Spanish'])[0];
  const { model } = recordFlashcardRating(history(), card, true, 'one', 1200, now);
  const restored = engine.normalizeLearnerModel(JSON.parse(JSON.stringify(model)));
  assert.ok(!flashcardQueue([lesson], restored, ['a'], ['Spanish'], now).some(c => c.id === card.id));
  assert.ok(flashcardQueue([lesson], restored, ['a'], ['Spanish'], new Date(now.getTime() + 86400001)).some(c => c.id === card.id));
});

test('listening has independent scheduling and excludes unseen or paused languages', () => {
  let model = history();
  let queue = listeningReviewQueue([lesson, next], model, ['a'], ['Spanish', 'Vietnamese'], now);
  assert.equal(queue.length, 2);
  assert.ok(queue.every(item => item.lesson.id === 'a' && item.evidence.edge.fromModality === 'audio'));
  model = engine.recordEvidence(model, 'a', 'Spanish', true, false, now, queue[0].evidence.edge, 1200, undefined, 'listening');
  queue = listeningReviewQueue([lesson], model, ['a'], ['Spanish', 'Vietnamese'], now);
  assert.equal(queue.length, 1); assert.equal(queue[0].evidence.language, 'Vietnamese');
  assert.equal(listeningReviewQueue([lesson], model, ['a'], ['French'], now).length, 0);
});

test('retired exact sentence cards stay retired until an independent deficiency', () => {
  let model = engine.emptyLearnerModel();
  for (let i = 0; i < 3; i++) model = engine.recordEvidence(model, 'a', 'Spanish', true, false, new Date(old.getTime() + i * 86400000), production, 1200, undefined, String(i));
  assert.ok(flashcardQueue([lesson], model, ['a'], ['Spanish'], now).every(c => c.kind === 'Vocabulary'));
  model = engine.recordEvidence(model, 'a', 'Spanish', false, false, old, production, 1200, 'production', 'failed');
  // Use a later deficiency, after the three demonstrations.
  model = engine.recordEvidence(model, 'a', 'Spanish', false, false, new Date('2026-10-26T12:00:00Z'), production, 1200, 'production', 'failed-later');
  assert.ok(flashcardQueue([lesson], model, ['a'], ['Spanish'], now).some(c => c.kind === 'Expression'));
});
