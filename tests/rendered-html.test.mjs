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

test("activates Vietnamese production from any non-native profile position", async () => {
  const source = await read("../app/page.tsx");
  assert.match(source, /\[profile\.second, \.\.\.profile\.additional\]/);
  assert.match(source, /activeLanguages\.includes\("vietnamese"\)/);
  assert.match(source, /setProductionLanguage\("Vietnamese"\)/);
  assert.match(source, /Spanish secured/);
  assert.match(source, /English meaning/);
});

test("offers structured reconstruction after three failed typed attempts", async () => {
  const [page, curriculum] = await Promise.all([read("../app/page.tsx"), read("../app/curriculum.ts")]);
  assert.match(page, /failedAttempts < 3/);
  assert.match(page, /setFailedAttempts\(\(value\) => value \+ 1\)/);
  assert.match(page, /function RecoveryBuilder/);
  assert.match(page, /Build it from what you now know/);
  assert.match(page, /supported-reconstruction/);
  assert.match(curriculum, /Who does estás address[\s\S]*rescue: \{ answer: "you", bank: \["I", "you", "we", "they"\]/);
});

test("defines the complete CEFR progression from A1 through C2", async () => {
  const source = await read("../app/cefr.ts");
  for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) assert.match(source, new RegExp(`level: "${level}"`));
  assert.match(source, /Basic user/);
  assert.match(source, /Independent user/);
  assert.match(source, /Proficient user/);
});
