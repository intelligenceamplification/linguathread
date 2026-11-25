import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const dependencies = new Map();
async function load(name) {
  if (dependencies.has(name)) return dependencies.get(name);
  const file = new URL(`../app/${name}.ts`, import.meta.url);
  const source = await readFile(file, "utf8");
  const options = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 };
  const compiled = ts.transpileModule(source, { compilerOptions: options }).outputText;
  const imports = new Map();
  for (const [, specifier] of compiled.matchAll(/require\("\.\/(.*?)"\)/g)) {
    imports.set(`./${specifier}`, await load(specifier));
  }
  const module = { exports: {} };
  const localRequire = createRequire(file);
  const evaluate = vm.runInThisContext(`(function(module, exports, require) { ${compiled}\n})`);
  evaluate(module, module.exports, (specifier) => imports.get(specifier) ?? localRequire(specifier));
  dependencies.set(name, module.exports);
  return module.exports;
}

const { buildXRayAnalysis, xrayRecall } = await load("xray-analysis");
const { xrayLanguages, xrayWordMatches, languageSentence } = await load("lesson-tools");
const { curriculum, sentenceAnatomyForLesson } = await load("curriculum");

const languages = ["Spanish", "English", "Vietnamese"];
const reference = {
  ...curriculum[0],
  id: "b1-u26-2-adding-qualification-lesson",
  sentence: {
    target: "Estoy de acuerdo en general, aunque la propuesta todavía necesita algunos cambios.",
    anchor: "I agree in general, although the proposal still needs some changes.",
    bridge: "Nhìn chung tôi đồng ý, mặc dù đề xuất vẫn cần một vài thay đổi.",
    note: "",
  },
};

test("aligns the concessive clauses and semantic units in each language's own order", () => {
  const spanish = buildXRayAnalysis(reference, "Spanish", languages);
  const vietnamese = buildXRayAnalysis(reference, "Vietnamese", languages);
  assert.deepEqual(spanish.clauses.map((clause) => clause.label), ["Overall agreement", "Concession", "Remaining concern"]);
  assert.deepEqual(spanish.units.map(({ role }) => role), ["verb", "modifier", "connector", "subject", "verb", "complement"]);
  assert.deepEqual(vietnamese.units.map(({ text }) => text), ["Nhìn chung", "tôi đồng ý", "mặc dù", "đề xuất", "vẫn cần", "một vài thay đổi"]);
  const concession = vietnamese.units.find((unit) => unit.role === "connector");
  assert.deepEqual(concession.forms, { Spanish: "aunque", English: "although", Vietnamese: "mặc dù" });
  assert.match(concession.languageNotes.Spanish, /present indicative/);
  assert.match(concession.languageNotes.Spanish, /hypothetical or as background/);
});

test("uses active languages for comparisons and recall, and never mixes a partial transfer with the original", () => {
  const active = xrayLanguages(reference, false);
  const { units, editorial } = buildXRayAnalysis(reference, "Spanish", active);
  assert.ok(units.every((unit) => !("Vietnamese" in unit.forms)));
  const rounds = xrayRecall(reference, active, editorial.transfer.forms);
  assert.equal(rounds.length, 2);
  assert.equal(rounds[0].prompt, rounds[1].answer);
  assert.equal(rounds[0].answer, rounds[1].prompt);
  assert.equal(rounds[1].prompt, "Although I agree, I still need more time.");
  assert.equal(xrayRecall(reference, active, { English: "A new sentence." })[1].prompt, reference.sentence.anchor);
  assert.equal(xrayRecall(reference, languages, editorial.transfer.forms).length, 6);
});

test("accepts published Vietnamese annotations keyed with accents", async () => {
  const { analyzeXRayScope, xrayScopes } = await load("lesson-tools");
  const entry = { meaning: "continuing necessity", baseForm: "vẫn cần", syntacticRole: "marks continuing necessity",
    morphology: "vẫn modifies cần", partOfSpeech: "Verb phrase", contrast: "still needs", usage: "state a remaining need" };
  const lesson = { ...reference, xray: { Vietnamese: { units: { "vẫn cần": entry } } } };
  const scope = xrayScopes(lesson, "Vietnamese").find((item) => item.text === "vẫn cần");
  assert.ok(scope);
  assert.equal(analyzeXRayScope(lesson, scope).directMeaning, entry.meaning);
});

test("covers every sentence token and constrains alignment to actual wording across the curriculum", async () => {
  const snapshot = process.env.XRAY_CURRICULUM_SNAPSHOT;
  const lessons = snapshot ? JSON.parse(await readFile(snapshot, "utf8")).lessons : curriculum;
  for (const lesson of lessons) {
    const model = sentenceAnatomyForLesson(lesson);
    for (const language of languages) {
      const sentence = languageSentence(lesson, language);
      const words = xrayWordMatches(sentence).map((token) => token[0]);
      const { units } = buildXRayAnalysis(lesson, language, languages, model);
      assert.deepEqual(units.flatMap((unit) => xrayWordMatches(unit.text).map((token) => token[0])), words, `${lesson.id} ${language}`);
      for (const unit of units) {
        for (const [name, form] of Object.entries(unit.forms)) {
          assert.ok(languageSentence(lesson, name).includes(form), `${lesson.id} ${name} ${form}`);
        }
      }
    }
  }
});
