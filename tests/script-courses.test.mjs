import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
async function load(path, dependencies = {}) {
 const source = await readFile(new URL(path, import.meta.url), "utf8");
 const cjs = { exports: {} };
 vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: cjs, exports: cjs.exports, require: (id) => dependencies[id] });
 return cjs.exports;
}
const literacy = await load("../app/script-literacy.ts");
const { scriptCourses } = await load("../app/script-courses.ts", { "./script-literacy": literacy });
const { newScriptPractice, assessScript, advanceScript, scriptAnswerMatches, parseScriptPractice, restartScriptPractice, hasScriptCompletion, scriptChoices } = await load("../app/script-course-engine.ts");
test("recognition answers do not occupy one predictable position", () => {
 const positions = new Set();
 for (const course of Object.values(scriptCourses)) for (const unit of course.lessons) {
  const choices = scriptChoices(unit);
  assert.equal(new Set(choices).size, unit.alternatives.length + 1);
  assert.deepEqual(choices, scriptChoices(unit));
  positions.add(choices.indexOf(unit.answer));
 }
 assert.ok(positions.size >= 3);
});
test("every offered language has authored script instruction and an acyclic ordered path", () => {
 assert.equal(Object.keys(scriptCourses).length, 13);
 const globalIds = new Set();
 for (const [language, course] of Object.entries(scriptCourses)) {
  assert.equal(course.language, language);
  assert.equal(course.status, "release-foundation");
  assert.equal(course.revision, 2);
  assert.ok(course.requirements.length >= 2);
  assert.ok(course.lessons.length >= 4);
  const previous = new Set();
  for (const unit of course.lessons) {
   assert.ok(!globalIds.has(unit.id)); globalIds.add(unit.id);
   assert.ok(unit.explanation.length > 100);
   assert.ok(unit.meaning && unit.prompt && unit.example);
   assert.ok(unit.prerequisites.every(id => previous.has(id)));
   assert.equal(new Set([unit.answer, ...unit.alternatives]).size, unit.alternatives.length + 1);
   assert.ok(unit.alternatives.length >= 2);
   assert.ok(scriptAnswerMatches(unit, unit.answer));
   for (const alternative of unit.alternatives) assert.equal(scriptAnswerMatches(unit, alternative), false, unit.id);
   previous.add(unit.id);
  }
 }
});
test("release literacy contract covers every directional mode and script-specific finite inventory", () => {
 assert.deepEqual([...literacy.requiredScriptModes].sort(), ["component-assembly", "device-dictation", "form-to-sound", "keyboard-reconstruction", "meaning-retrieval", "sound-to-form", "unseen-transfer", "visual-recognition"].sort());
 assert.equal(literacy.scriptRequirements.ko[0].inventory.length, 40);
 assert.equal(literacy.scriptRequirements.ar[0].inventory.length, 28);
 assert.equal(literacy.scriptRequirements.ru[0].inventory.length, 33);
 assert.equal(literacy.scriptRequirements.ja[0].inventory.length, 46);
 assert.equal(literacy.scriptRequirements.ja[1].inventory.length, 46);
 assert.ok(literacy.scriptRequirements.vi[1].scope.includes("Telex"));
 assert.ok(literacy.scriptRequirements.zh[1].scope.includes("course-linked"));
 assert.ok(literacy.scriptRequirements.hi[1].scope.includes("halant"));
});
test("every authored unit traverses study and check routes with reload-safe review scheduling", () => {
 for (const course of Object.values(scriptCourses)) for (const unit of course.lessons) for (const check of [false, true]) {
  let state = newScriptPractice(check);
  if (!check) state = advanceScript(state, 1000);
  state = advanceScript(assessScript(unit, state, unit.answer), 1000);
  state = advanceScript(assessScript(unit, state, unit.answer), 1000);
  state = { ...state, result: "correct", passed: { ...state.passed, "component-assembly": true } };
  state = advanceScript(state, 1000);
  state = parseScriptPractice(JSON.parse(JSON.stringify(state)));
  assert.equal(state.phase, "write");
  state = advanceScript(assessScript(unit, state, unit.answer), 1000);
  assert.equal(state.phase, "complete");
  assert.equal(state.supported, !check);
  assert.equal(state.reviewAt, 1000 + (check ? 3 : 1) * 86400000);
 }
});
test("script checks retain the features sentence normalization would erase", () => {
 assert.equal(scriptAnswerMatches(scriptCourses.es.lessons[3], "Dónde está?"), false);
 assert.equal(scriptAnswerMatches(scriptCourses.en.lessons[0], "i"), false);
 assert.equal(scriptAnswerMatches(scriptCourses.ru.lessons[0], "p"), false);
 assert.ok(scriptAnswerMatches(scriptCourses.vi.lessons[2], scriptCourses.vi.lessons[2].answer.normalize("NFD")));
});
test("errors and assistance cannot silently become an unaided check", () => {
 const unit = scriptCourses.ko.lessons[0];
 let state = assessScript(unit, newScriptPractice(true), unit.alternatives[0]);
 assert.equal(state.result, "retry");
 assert.equal(advanceScript(state, 1000).phase, "visual");
 state = advanceScript(assessScript(unit, state, unit.answer), 1000);
 state = advanceScript(assessScript(unit, state, unit.answer), 1000);
 state = advanceScript({ ...state, result: "correct", passed: { ...state.passed, "component-assembly": true } }, 1000);
 state = advanceScript(assessScript(unit, state, unit.answer), 1000);
 assert.equal(state.supported, true);
 assert.equal(parseScriptPractice({ ...newScriptPractice(), phase: "complete" }), null);
});
test("revisiting a completed lesson does not relock downstream prerequisites", () => {
 const unit = scriptCourses.ko.lessons[0];
 let state = advanceScript(assessScript(unit, newScriptPractice(true), unit.answer), 1000);
 state = advanceScript(assessScript(unit, state, unit.answer), 1000);
 state = advanceScript({ ...state, result: "correct", passed: { ...state.passed, "component-assembly": true } }, 1000);
 state = advanceScript(assessScript(unit, state, unit.answer), 1000);
 const restarted = restartScriptPractice(state);
 assert.equal(restarted.phase, "study");
 assert.ok(hasScriptCompletion(parseScriptPractice(JSON.parse(JSON.stringify(restarted)))));
});
