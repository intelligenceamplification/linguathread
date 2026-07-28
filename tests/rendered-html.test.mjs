import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("builds PolyFlow on the standard Next.js runtime", async () => {
  const packageJson = JSON.parse(await read("../package.json"));
  assert.equal(packageJson.scripts.build, "next build");
  assert.equal(packageJson.scripts.dev, "next dev");
  assert.ok(packageJson.dependencies["@neondatabase/serverless"]);
  await read("../.next/BUILD_ID");
});

test("preserves the language setup and calm learning interface", async () => {
  const [page, layout] = await Promise.all([read("../app/page.tsx"), read("../app/layout.tsx")]);
  assert.match(layout, /PolyFlow/);
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

test("defines the complete CEFR progression from A1 through C2", async () => {
  const source = await read("../app/cefr.ts");
  for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) assert.match(source, new RegExp(`level: "${level}"`));
  assert.match(source, /Basic user/);
  assert.match(source, /Independent user/);
  assert.match(source, /Proficient user/);
});
