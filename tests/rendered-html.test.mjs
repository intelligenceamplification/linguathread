import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

async function loadInteractiveSentenceModule() {
  const source = await read("../app/interactive-sentence.ts");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const cjsModule = { exports: {} };
  vm.runInNewContext(compiled, { module: cjsModule, exports: cjsModule.exports, Map, Array, String });
  return cjsModule.exports;
}

test("builds LinguaThread on the standard Next.js runtime", async () => {
  const packageJson = JSON.parse(await read("../package.json"));
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.ok(packageJson.dependencies["@neondatabase/serverless"]);
  await read("../.next/BUILD_ID");
});

test("preserves the language setup and calm learning interface", async () => {
  const [page, layout] = await Promise.all([read("../app/page.tsx"), read("../app/layout.tsx")]);
  assert.match(layout, /LinguaThread/);
  assert.match(page, /Your language stack/);
  assert.match(page, /What language shaped your first thoughts/);
  assert.match(page, /Search or type a language/);
  assert.match(page, /Language begins from what you already know/);
});

test("follows the device light and dark appearance automatically", async () => {
  const [styles, layout] = await Promise.all([read("../app/globals.css"), read("../app/layout.tsx")]);
  assert.match(styles, /color-scheme: light dark/);
  assert.match(styles, /@media \(prefers-color-scheme: dark\)/);
  assert.match(styles, /--paper: #0f1412/);
  assert.match(styles, /--primary-text: #101512/);
  assert.match(layout, /prefers-color-scheme: light/);
  assert.match(layout, /prefers-color-scheme: dark/);
});

test("ships an expanded A1 curriculum rather than one repeating foundation", async () => {
  const source = await read("../app/curriculum.ts");
  const lessonIds = [...source.matchAll(/id: "(es-u\d-l\d-[^"]+)"/g)].map((match) => match[1]);
  assert.equal(lessonIds.length, 24);
  assert.equal(new Set(lessonIds).size, 24);
  assert.match(source, /Names and introductions/);
  assert.match(source, /Attention and presence/);
  assert.match(source, /Human connection/);
  assert.ok((source.match(/bridgeMastery:/g) || []).length >= 9);
  assert.match(source, /Now say it in Vietnamese/);
});

test("uses a durable learner model and adaptive curriculum router", async () => {
  const [page, engine] = await Promise.all([read("../app/page.tsx"), read("../app/learning-engine.ts")]);
  assert.match(page, /polyflow\.learner-model\.v1/);
  assert.match(page, /selectNextLesson/);
  assert.match(page, /recordEvidence/);
  assert.match(engine, /introduced/);
  assert.match(engine, /forming/);
  assert.match(engine, /usable/);
  assert.match(engine, /stable/);
  assert.match(engine, /maintenance/);
  assert.match(engine, /sessionsCompleted % 4/);
});

test("loads independently published curriculum packs with a bundled fallback", async () => {
  const [page, route, packs, manifest] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/api/curriculum/route.ts"),
    read("../app/curriculum-packs.ts"),
    read("../curriculum/manifest.json"),
  ]);
  assert.match(page, /fetch\("\/api\/curriculum"\)/);
  assert.match(route, /raw\.githubusercontent\.com/);
  assert.match(route, /curriculum-data/);
  assert.match(route, /source: "bundled"/);
  assert.match(packs, /validateManifest/);
  assert.match(packs, /validatePack/);
  assert.match(packs, /Published lesson id already exists/);
  assert.equal(JSON.parse(manifest).revision, 1);
});

test("activates Vietnamese production from any non-native profile position", async () => {
  const source = await read("../app/page.tsx");
  assert.match(source, /\[profile\.second, \.\.\.profile\.additional\]/);
  assert.match(source, /activeLanguages\.includes\("vietnamese"\)/);
  assert.match(source, /setProductionLanguage\("Vietnamese"\)/);
  assert.match(source, /Spanish secured/);
  assert.match(source, /English meaning/);
});

test("offers typed model recovery after three failed attempts in every language", async () => {
  const [page, curriculum] = await Promise.all([read("../app/page.tsx"), read("../app/curriculum.ts")]);
  assert.match(page, /failedAttempts < 3/);
  assert.match(page, /setFailedAttempts\(\(value\) => value \+ 1\)/);
  assert.match(page, /function RecoveryBuilder/);
  assert.match(page, /Here is the model/);
  assert.match(page, /Type the model/);
  assert.match(page, /Skip this lesson for now/);
  assert.match(page, /recordAttempt\("skipped", false, language\)/);
  assert.doesNotMatch(page, /Continue with model/);
  assert.match(page, /supported-reconstruction/);
  assert.doesNotMatch(page, /sentence-builder/);
  assert.doesNotMatch(page, /word-bank/);
  assert.match(curriculum, /Who does estás address[\s\S]*rescue: \{ answer: "you" \}/);
  assert.doesNotMatch(curriculum, /bank:/);
});

test("uses typed target production with a three-attempt model that must be typed", async () => {
  const [page, curriculum, engine] = await Promise.all([read("../app/page.tsx"), read("../app/curriculum.ts"), read("../app/learning-engine.ts")]);
  assert.match(page, /function TransformExercise/);
  assert.match(page, /label=\{`\$\{targetLanguage\} target answer`\}/);
  assert.match(page, /failedAttempts >= 3/);
  assert.match(page, /Target model/);
  assert.match(page, /Type this sentence to secure the pattern, or skip this lesson for now/);
  assert.doesNotMatch(page, /Continue with model/);
  assert.doesNotMatch(page, /lesson\.transform\.words/);
  assert.doesNotMatch(page, /lesson\.transform\.bank/);
  assert.match(curriculum, /transform: \{ language: string; prompt: string; bridgeReminder: string; accepted: string\[\]; answer: string; hint: string \}/);
  assert.match(engine, /export type LearningLanguage = string/);
});

test("treats the target model as a eucalyptus reference sheet", async () => {
  const styles = await read("../app/globals.css");
  assert.match(styles, /--model-bg: #eef3f0/);
  assert.match(styles, /--model-border: #9bafa3/);
  assert.match(styles, /--model-bg: #19251f/);
  assert.match(styles, /--model-border: #5d7b6c/);
  assert.match(styles, /\.target-model \{[^}]*border: 1px solid var\(--model-border\); background: var\(--model-bg\)/);
});

test("defines the family sentence as structured interactive anatomy", async () => {
  const [data, component, page] = await Promise.all([
    read("../app/interactive-sentence.ts"),
    read("../app/sentence-anatomy.tsx"),
    read("../app/page.tsx"),
  ]);
  assert.match(data, /familySentenceAnatomy/);
  assert.match(data, /Mi familia vive cerca\./);
  assert.match(data, /Gia đình tôi sống gần đây\./);
  assert.match(data, /kind: "reordered"/);
  assert.match(data, /unitIds: \["es-mi", "es-familia"\]/);
  assert.match(data, /relationships:/);
  assert.match(component, /Language X-Ray/);
  assert.match(component, /See what changes/);
  assert.match(component, /event\.key === "Escape"/);
  assert.match(component, /aria-pressed/);
  assert.match(component, /data-follows-word/);
  assert.match(page, /sentenceAnatomyForLesson/);
});

test("uses sentence anatomy for every shipped curriculum lesson", async () => {
  const [curriculum, page] = await Promise.all([read("../app/curriculum.ts"), read("../app/page.tsx")]);
  assert.match(curriculum, /createInteractiveSentenceModel\(item\)/);
  assert.match(curriculum, /export function sentenceAnatomyForLesson/);
  assert.match(page, /sentenceAnatomyForLesson\(lesson\)/);
  assert.doesNotMatch(page, /stage === "sentence" && !lesson\.anatomy/);
});

test("keeps visible curriculum copy free of the known question-punctuation typo", async () => {
  const curriculum = await read("../app/curriculum.ts");
  assert.match(curriculum, /principle: "¿Dónde está\.\.\.\?"/);
  assert.doesNotMatch(curriculum, /¿dónde está\.\.\.?”,/);
});

test("creates structured anatomy, relationships, and non-one-to-one mappings for any curriculum sentence", async () => {
  const { createInteractiveSentenceModel } = await loadInteractiveSentenceModule();
  const model = createInteractiveSentenceModel({
    id: "test-request",
    spanish: "Quiero agua, por favor.",
    english: "I would like water, please.",
    vietnamese: "Tôi muốn nước, làm ơn.",
    focus: "Quiero",
    pattern: "quiero + noun",
    bridgePattern: "tôi + muốn + noun",
    words: [["quiero", "I would like", "tôi muốn"], ["agua", "water", "nước"], ["por favor", "please", "làm ơn"], ["gracias", "thank you", "cảm ơn"]],
  });
  assert.equal(model.realizations.length, 3);
  assert.ok(model.realizations.every((realization) => realization.units.length > 0));
  assert.equal(model.relationships.length, 3);
  assert.equal(model.mappings.length, 2);
  assert.ok(model.mappings.every((mapping) => mapping.from.unitIds.length > 1 && mapping.to.unitIds.length > 1));
  assert.match(model.mappings[1].explanation, /tôi \+ muốn \+ noun/);
  assert.equal(model.realizations[0].units[0].meaning, "I would like");
  assert.ok(model.realizations.every((realization) => realization.units.every((unit) => unit.label === undefined && unit.structural === undefined && unit.grammar.length === 0)));
});

test("keeps universal X-Ray quiet until lesson-specific structure is authored", async () => {
  const [component, data] = await Promise.all([read("../app/sentence-anatomy.tsx"), read("../app/interactive-sentence.ts")]);
  assert.match(component, /const xrayLabels = realization/);
  assert.match(component, /mode === "xray" && xrayLabels\.length > 0/);
  assert.doesNotMatch(data, /Target element|Anchor element|Bridge element|Sentence element/);
});

test("defines the complete CEFR progression from A1 through C2", async () => {
  const source = await read("../app/cefr.ts");
  for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) assert.match(source, new RegExp(`level: "${level}"`));
  assert.match(source, /Basic user/);
  assert.match(source, /Independent user/);
  assert.match(source, /Proficient user/);
});
