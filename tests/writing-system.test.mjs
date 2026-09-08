import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
const modules = new Map();
async function load(path) {
 const url = new URL(path, import.meta.url); if (modules.has(url.href)) return modules.get(url.href);
 const source = await readFile(url, "utf8");
 const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 const dependencies = {};
 for (const match of output.matchAll(/require\("(\.[^"]+)"\)/g)) dependencies[match[1]] = await load(new URL(`${match[1]}.ts`, url).href);
 const loadedModule = { exports: {} }; vm.runInNewContext(output, { module: loadedModule, exports: loadedModule.exports, require: id => dependencies[id], Date, Set, Map, Intl }); modules.set(url.href, loadedModule.exports); return loadedModule.exports;
}
const model = await load("../app/writing-system/model.ts");
const { writingCourses } = await load("../app/writing-system/curriculum.ts");
const { courseMaterial, relatedVocabulary } = await load("../app/writing-system/course-links.ts");

test("every course has valid unique units, prerequisites and response controls", () => {
 assert.equal(Object.keys(writingCourses).length, 13);
 for (const course of Object.values(writingCourses)) {
  assert.ok(course.units.every(unit => ["Foundation", "A1", "A2", "B1", "B2"].includes(unit.level)), `${course.language} proficiency outcomes`);
  const ids = new Set(course.units.map(u => u.id)); assert.equal(ids.size, course.units.length);
  for (const unit of course.units) {
   assert.ok(unit.exercises.length > 0, unit.id);
   for (const prerequisite of unit.prerequisites) assert.ok(ids.has(prerequisite), prerequisite);
   for (const exercise of unit.exercises) {
    assert.ok(model.assess(exercise, exercise.answer), exercise.id);
    if (exercise.kind.includes("choice")) { assert.ok(exercise.choices.includes(exercise.answer)); assert.ok(new Set(exercise.choices).size >= 2); }
    if (exercise.kind === "compose") assert.equal(model.combine(exercise.components, exercise.composition), exercise.answer, exercise.id);
   }
  }
  const visiting = new Set(), visited = new Set();
  function visit(id) { assert.ok(!visiting.has(id), `cycle ${id}`); if (visited.has(id)) return; visiting.add(id); course.units.find(u => u.id === id).prerequisites.forEach(visit); visiting.delete(id); visited.add(id); }
  course.units.forEach(u => visit(u.id));
 }
});
test("legacy revisions preserve historical completion without inventing mastery", () => {
 const progress = model.migrateLegacy(model.emptyProgress(), { "2:vi-script-letters": { phase: "complete" }, "3:vi-script-letters": { phase: "complete" }, "3:vi-script-tones": { phase: "visual" } });
 assert.equal(progress.legacy.length, 1); assert.equal(progress.legacy[0], "vi-script-letters"); assert.equal(Object.keys(progress.edges).length, 0);
 assert.deepEqual(model.parseProgress(JSON.parse(JSON.stringify(progress))), progress);
});
test("mastery needs independent evidence across time and examples; directions remain separate", () => {
 const base = { id: "first", skill: "vi:form:đ", direction: "recognize", kind: "choice", answer: "đ", prompt: "Choose", explanation: "" };
 let p = model.emptyProgress(), now = Date.UTC(2026, 8, 7);
 for (let i = 0; i < 8; i++) p = model.recordAttempt(p, base, true, false, now, 900);
 assert.notEqual(model.edgeState(p.edges[model.edgeKey(base)], now), "strong");
 p = model.recordAttempt(p, { ...base, id: "second" }, true, false, now + 86400000, 800);
 p = model.recordAttempt(p, base, true, false, now + 2 * 86400000, 800);
 assert.equal(model.edgeState(p.edges[model.edgeKey(base)], now + 2 * 86400000), "strong");
 assert.equal(model.edgeState(p.edges[model.edgeKey({ ...base, direction: "input" })], now), "new");
 p = model.recordAttempt(p, base, false, false, now + 2 * 86400000, 1500);
 assert.equal(model.edgeState(p.edges[model.edgeKey(base)], now + 2 * 86400000), "weak");
});
test("dictation cannot silently certify keyboard spelling", () => {
 const e = { id: "type", skill: "zh:word:你", direction: "input", kind: "input", answer: "你" };
 const p = model.recordAttempt(model.emptyProgress(), e, true, false, Date.now(), 900, "dictation");
 assert.equal(p.edges[model.edgeKey(e)], undefined); assert.equal(p.edges[`${model.edgeKey(e)}:dictation`].independent, 1);
});
test("a correct in-flight response survives reload without asking for duplicate evidence", () => {
 const saved = { ...model.emptyProgress(), session: { unit: "vi-letters", index: 1, helped: false, correct: true, answer: "đ" } };
 const restored = model.parseProgress(JSON.parse(JSON.stringify(saved)));
 assert.equal(restored.session.correct, true);
 assert.equal(restored.session.answer, "đ");
 assert.equal(restored.session.index, 1);
 assert.equal(model.parseProgress({ session: { unit: "x", index: -1 } }).session, undefined);
});
test("script composition respects blocks and combining marks", () => {
 assert.equal(model.combine(["ㄱ", "ㅏ", "ㄴ"], "hangul"), "간");
 assert.equal(model.combine(["ㄱ", "ㅘ"], "hangul"), "과");
 assert.equal(model.combine(["a", "\u0306", "\u0301"]), "ắ");
 assert.equal(model.combine(["क", "ि"]), "कि");
 assert.equal(model.combine(["は", "\u309a"]), "ぱ");
});
test("orthographic assessment retains meaningful marks and accepts canonical Unicode", () => {
 const e = { answer: "tiếng" }; assert.ok(model.assess(e, "tiếng".normalize("NFD"))); assert.equal(model.assess(e, "tieng"), false);
 assert.equal(model.assess({ answer: "р" }, "p"), false);
});
test("finite foundation inventory is taught, rather than listed only", () => {
 for (const [language, expected] of [["vi",29],["ko",40],["ar",28],["ru",33],["ja",92]]) {
  const units = writingCourses[language].units.filter(u => u.stage === "forms");
  const forms = new Set(units.flatMap(u => u.exercises.filter(e => e.direction === "recognize").map(e => e.answer)));
  assert.equal(forms.size, expected, language);
 }
});
test("review targets a due edge without requiring a full lesson restart", () => {
 const course = writingCourses.vi, unit = course.units[0], exercise = unit.exercises[0], now = Date.UTC(2026,8,7);
 const p = model.recordAttempt(model.emptyProgress(), exercise, false, false, now, 800);
 const queue = model.reviewQueue(course, p, now + 600001);
 assert.equal(queue.length, 1); assert.equal(queue[0].exercise.skill, exercise.skill);
});
test("replaying a transfer item cannot manufacture fresh unseen-transfer evidence", () => {
 const exercise = writingCourses.vi.units.find(u => u.id === "vi-reading-transfer").exercises[0];
 let p = model.recordAttempt(model.emptyProgress(), exercise, true, false, Date.now(), 900);
 p = model.recordAttempt(p, exercise, true, false, Date.now() + 86400000, 900);
 assert.equal(p.edges[model.edgeKey(exercise)].transfers, 1);
 let failed = model.recordAttempt(model.emptyProgress(), exercise, false, false, Date.now(), 900);
 failed = model.recordAttempt(failed, exercise, true, false, Date.now() + 86400000, 900);
 assert.equal(failed.edges[model.edgeKey(exercise)].transfers, 0);
});
test("Vietnamese word prerequisites include their actual letters and written tones", () => {
 const grandmother = writingCourses.vi.units.find(u => u.title === "bà" && u.stage === "words");
 assert.ok(grandmother.prerequisites.includes("vi-architecture-tone-huyền"));
 assert.ok(grandmother.prerequisites.includes("vi-literacy-forms-0"));
 assert.equal(model.unlocked(grandmother, model.emptyProgress()), false);
});
test("main-course links never substitute an unrelated language for missing content", () => {
 const lesson = { id: "test", title: "Read", level: "A1", sentence: { target: "Leo.", anchor: "I read.", bridge: "Tôi đọc." }, vocabulary: [{ word: "leo", english: "I read", vietnamese: "tôi đọc" }] };
 assert.equal(courseMaterial(lesson, "vi").sentence, "Tôi đọc.");
 assert.equal(courseMaterial(lesson, "ko").sentence, undefined);
 assert.equal(courseMaterial(lesson, "ko").vocabulary.length, 0);
 assert.equal(relatedVocabulary(["đ"], courseMaterial(lesson, "vi").vocabulary).length, 1);
 assert.equal(relatedVocabulary(["d"], courseMaterial(lesson, "vi").vocabulary).length, 0);
});
test("a content update cannot lock a previously completed lesson out of review", () => {
 const unit = { id: "completed", prerequisites: ["new-foundation"] };
 assert.equal(model.unlocked(unit, { ...model.emptyProgress(), completed: ["completed"] }), true);
});
test("every language has a real architecture progression and repeatable mastery contexts", () => {
 for (const course of Object.values(writingCourses)) {
  const architecture = course.units.filter(unit => unit.track === "architecture");
  assert.ok(architecture.length >= 4, `${course.language} architecture depth`);
  const contexts = new Map();
  for (const unit of course.units) for (const exercise of unit.exercises) {
   const key = model.edgeKey(exercise); contexts.set(key, (contexts.get(key) || 0) + 1);
  }
  assert.ok([...contexts.values()].some(count => count >= 2), `${course.language} varied evidence`);
 }
});
test("Mandarin and Japanese preserve separate writing-system tracks", () => {
 const zh = writingCourses.zh;
 assert.ok(zh.units.some(unit => unit.track === "pinyin" && unit.id.includes("tone")));
 assert.ok(zh.units.some(unit => unit.track === "hanzi" && unit.id.includes("compound")));
 const ja = writingCourses.ja;
 assert.ok(ja.units.some(unit => unit.track === "hiragana" && unit.id.includes("voiced")));
 assert.ok(ja.units.some(unit => unit.track === "katakana" && unit.id.includes("katakana")));
 assert.ok(ja.units.some(unit => unit.track === "words-kanji" && unit.id.includes("kanji")));
});
test("Mandarin components precede characters, compounds and reading", () => {
 const hanzi = writingCourses.zh.units.filter(unit => unit.track === "hanzi");
 assert.match(hanzi[0].id, /hanzi-component/);
 assert.ok(hanzi.findIndex(unit => unit.title === "人") < hanzi.findIndex(unit => unit.title === "学生"));
 for (let i = 1; i < hanzi.length; i++) {
  assert.equal(hanzi[i].prerequisites.length, 1);
  assert.equal(hanzi[i].prerequisites[0], hanzi[i - 1].id);
 }
 const reading = writingCourses.zh.units.find(unit => unit.id === "zh-reading-0");
 assert.equal(reading.prerequisites[0], hanzi.at(-1).id);
});
