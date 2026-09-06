import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
const source = await readFile(new URL("../app/multilingual-foundation.ts", import.meta.url), "utf8");
const compiledModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: compiledModule.exports, module: compiledModule });
const { foundationLanguages: languages, foundationObjectives: objectives, foundationContent: content, foundationInstructions: instructions, foundationProgressKey: key, validStack, acceptsFoundationAnswer: accepts } = compiledModule.exports;
test("all 13 catalog languages have four explicit draft realizations and localized instructions", () => {
 assert.equal(languages.length, 13);
 for (const { id } of languages) {
  assert.equal(instructions[id].length, 10);
  assert.ok(instructions[id].every(value => value.trim().length));
  for (const objective of objectives) {
   assert.ok(content[id][objective].text.trim());
   assert.ok(accepts(objective, id, content[id][objective].text));
   for (const answer of content[id][objective].accepted || []) assert.ok(accepts(objective, id, answer));
   assert.equal(accepts(objective, id, ""), false);
   assert.equal(accepts(objective, id, "definitely not the answer"), false);
  }
 }
});
test("all 1716 ordered trios resolve their own texts and isolated progress", () => {
 const keys = new Set();
 for (const anchor of languages) for (const bridge of languages) for (const target of languages) {
  const stack = { anchor: anchor.id, bridge: bridge.id, target: target.id };
  if (new Set(Object.values(stack)).size !== 3) { assert.equal(validStack(stack), false); continue; }
  assert.equal(validStack(stack), true);
  keys.add(key(stack));
  for (const objective of objectives) for (const id of Object.values(stack)) assert.ok(accepts(objective, id, content[id][objective].text));
 }
 assert.equal(keys.size, 1716);
});
test("native scripts are real content, not Latin placeholders", () => {
 for (const [id, script] of [["zh", /\p{Script=Han}/u], ["ko", /\p{Script=Hangul}/u], ["ja", /[\p{Script=Hiragana}\p{Script=Katakana}]/u], ["ar", /\p{Script=Arabic}/u], ["hi", /\p{Script=Devanagari}/u], ["ru", /\p{Script=Cyrillic}/u]]) {
  for (const objective of objectives) assert.match(content[id][objective].text, script);
 }
});
test("normalization accepts typography without erasing meaning-bearing accents", () => {
 assert.ok(accepts("name", "fr", "Je m'appelle Alex"));
 assert.ok(accepts("thanks", "zh", "謝謝"));
 assert.ok(accepts("thanks", "pt", "Obrigada"));
 assert.equal(accepts("thanks", "vi", "Cam on"), false);
 assert.equal(accepts("origin", "es", "Soy de Canada"), false);
 assert.equal(validStack({ anchor: "en", bridge: "ko", target: "xx" }), false);
});
