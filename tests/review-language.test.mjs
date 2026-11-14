import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeReviewAnswer, reviewDirection, reviewPhraseTiles } from '../app/review-language.ts';

test('review keeps meaningful accents and English apostrophes', () => {
 assert.notEqual(normalizeReviewAnswer('bạn', 'Vietnamese'), normalizeReviewAnswer('ban', 'Vietnamese'));
 assert.notEqual(normalizeReviewAnswer("I'm ready", 'English'), normalizeReviewAnswer('Im ready', 'English'));
 assert.equal(normalizeReviewAnswer('Tôi đến từ đây.', 'Vietnamese'), normalizeReviewAnswer('To\u0302i đe\u0302\u0301n tu\u031b\u0300 đa\u0302y', 'Vietnamese'));
});
test('authored phrase segmentation is used when it matches the answer', () => {
 const lesson = { anatomy: { realizations: [{ language: 'vietnamese', sentence: 'Gia đình tôi sống gần đây.', units: [{ text: 'Gia đình', after: ' ' }, { text: 'tôi', after: ' ' }, { text: 'sống', after: ' ' }, { text: 'gần đây', after: '.' }] }] } };
 assert.deepEqual(reviewPhraseTiles(lesson, 'Vietnamese', 'Gia đình tôi sống gần đây.'), ['Gia đình', 'tôi', 'sống', 'gần đây']);
 assert.deepEqual(reviewPhraseTiles({}, 'Spanish', 'muy muy bien'), ['muy', 'muy', 'bien']);
 assert.equal(reviewDirection('Arabic'), 'rtl');
});
