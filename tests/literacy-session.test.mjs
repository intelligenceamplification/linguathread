import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const modules = {};
async function load(path, deps = {}) {
 const source = await readFile(new URL(path, import.meta.url), "utf8");
 const cjs = { exports: {} };
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: cjs, exports: cjs.exports, require: name => { if (!(name in deps)) throw new Error(name); return deps[name]; } });
 return cjs.exports;
}
modules.foundation = await load("../app/multilingual-foundation.ts");
modules.session = await load("../app/multilingual-preview/literacy-session.ts", { "../multilingual-foundation": modules.foundation });
modules.progress = await load("../app/multilingual-preview/progress.ts", { "../multilingual-foundation": modules.foundation, "./literacy-session": modules.session });
modules.copy = await load("../app/multilingual-preview/literacy-copy.ts");
const { beginLiteracy, assessLiteracy, advanceLiteracy, parseLiteracy, literacyCounts } = modules.session;
const { foundationLanguages, foundationObjectives, foundationContent } = modules.foundation;

function finish(language, path, assisted = false) {
 let session = beginLiteracy(path);
 let iterations = 0;
 while (session.phase !== "summary" && iterations++ < 40) {
  if (session.phase === "study") { session = advanceLiteracy(session); continue; }
  const objective = foundationObjectives[session.index];
  if (session.phase === "write") session = { ...session, answer: foundationContent[language][objective].text, input: assisted ? "assisted" : "typed" };
  session = advanceLiteracy(assessLiteracy(session, language, objective));
  session = parseLiteracy(JSON.parse(JSON.stringify(session)));
 }
 assert.equal(session.phase, "summary");
 return session;
}
test("all 13 languages traverse four reading and four writing items with reload-safe evidence", () => {
 for (const { id } of foundationLanguages) {
  const session = finish(id, "check");
  assert.equal(session.evidence.length, 8);
  assert.equal(literacyCounts(session).recognition, 4);
  assert.equal(literacyCounts(session).writing, 4);
  assert.ok(session.evidence.slice(0, 4).every(e => e.skill === "recognition"));
 }
});
test("study and assisted input never become unaided writing evidence", () => {
 for (const { id } of foundationLanguages) {
  const studied = literacyCounts(finish(id, "foundations"));
  assert.equal(studied.recognition, 0);
  assert.equal(studied.writing, 0);
  assert.equal(studied.supportedWriting, 4);
  assert.equal(literacyCounts(finish(id, "check", true)).writing, 0);
 }
});
test("wrong recognition attempts remain supported after retry; double submission is idempotent", () => {
 const wrong = assessLiteracy(beginLiteracy("check"), "ko", "thanks");
 assert.equal(wrong.feedback, "retry");
 assert.equal(advanceLiteracy(wrong).phase, "recognize");
 const correct = assessLiteracy(wrong, "ko", "greeting");
 assert.equal(correct.evidence.at(-1).supported, true);
 assert.equal(assessLiteracy(correct, "ko", "greeting").evidence.length, 2);
});
test("invalid storage and forged empty completion cannot unlock lessons", () => {
 for (const value of [null, [], {}, { ...beginLiteracy("check"), index: 99 }, { ...beginLiteracy("check"), phase: "summary" }, { ...beginLiteracy("check"), evidence: [null] }]) assert.equal(parseLiteracy(value).phase, "choose");
});
test("old copied-input flags preserve lesson position but never grant literacy placement", () => {
 const restored = modules.progress.parseProgress({ lesson: 2, stage: 1, supported: [1], draftAnswer: "你", readyV2: ["zh"] });
 assert.equal(restored.lesson, 2);
 assert.equal(restored.draftAnswer, "你");
 assert.equal(restored.literacy.zh, undefined);
 assert.equal(modules.progress.parseProgress({ lesson: 4, stage: 3, supported: [] }).lesson, 0);
});
test("every anchor language has every core literacy instruction", () => {
 for (const { id } of foundationLanguages) {
  const copy = modules.copy.literacyCopy(id);
  assert.equal(Object.keys(copy).length, 22);
  assert.ok(Object.values(copy).every(value => value.trim()));
  if (id !== "en") assert.notEqual(copy.intro, modules.copy.literacyCopy("en").intro);
 }
});
