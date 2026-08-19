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

async function loadLessonToolsModule() {
  const source = await read("../app/lesson-tools.ts");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const cjsModule = { exports: {} };
  vm.runInNewContext(compiled, { module: cjsModule, exports: cjsModule.exports, Map, Array, String, Date });
  return cjsModule.exports;
}

async function loadCurriculumModule() {
  const [source, interactiveSentence] = await Promise.all([read("../app/curriculum.ts"), loadInteractiveSentenceModule()]);
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const cjsModule = { exports: {} };
  const localRequire = (specifier) => specifier === "./interactive-sentence" ? interactiveSentence : {};
  vm.runInNewContext(compiled, { module: cjsModule, exports: cjsModule.exports, require: localRequire, Map, Set, Array, String, Object });
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
  assert.match(page, /linguathread\.learner-model\.v1/);
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

test("defines a complete A1-C2 course spine without mislabeling planned content as authored", async () => {
  const [mapSource, page, route, documentation] = await Promise.all([
    read("../app/course-map.ts"),
    read("../app/page.tsx"),
    read("../app/api/curriculum/route.ts"),
    read("../curriculum/README.md"),
  ]);
  for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) assert.match(mapSource, new RegExp(`${level}: \\[`));
  assert.match(mapSource, /plannedLessons: 12/);
  assert.match(mapSource, /plannedCourseLessonCount/);
  assert.match(page, /Your language course/);
  assert.match(page, />Course<\/button>/);
  assert.match(page, /Authoring in progress/);
  assert.match(page, /Only reviewed, publishable lessons enter your learning sequence/);
  assert.match(route, /mappedUnitCount/);
  assert.match(route, /plannedLessonCount/);
  assert.match(documentation, /A mapped lesson position is not a published lesson/);
  assert.match(documentation, /Listening and spontaneous speaking require separate practice and assessment/);
  assert.match(mapSource, /outsidePractice/);
  assert.match(page, /Beyond LinguaThread · optional practice/);
  assert.match(page, /lesson\.lesson % 4 === 0/);
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

test("offers universal X-Ray scopes and a complete standalone analysis for voy", async () => {
  const { analyzeXRayScope, xrayScopes } = await loadLessonToolsModule();
  const lesson = {
    id: "plans", title: "Near-future plans", skill: "ir a + infinitive",
    vocabulary: [{ word: "voy", english: "I am going", vietnamese: "tôi sẽ" }, { word: "visitar", english: "to visit", vietnamese: "thăm" }],
    sentence: { target: "Mañana voy a visitar a un amigo.", anchor: "Tomorrow I am going to visit a friend.", bridge: "Ngày mai tôi sẽ đi thăm một người bạn.", note: "A clear plan stays close to the present." },
    grammar: { focus: "Voy a visitar", target: { pattern: "ir a + infinitive", explanation: "Voy is the first-person form of ir." }, anchor: { pattern: "be going to + infinitive", explanation: "English uses a future frame." }, bridge: { pattern: "time + sẽ + verb", explanation: "Vietnamese uses a stable aspect marker." }, insight: "The plan is shared while the structures differ." },
  };
  const scopes = xrayScopes(lesson, "Spanish");
  assert.ok(scopes.some((scope) => scope.kind === "word" && scope.text === "voy"));
  assert.ok(scopes.some((scope) => scope.kind === "phrase" && scope.text === "Voy a visitar"));
  assert.ok(scopes.some((scope) => scope.kind === "sentence"));
  const analysis = analyzeXRayScope(lesson, scopes.find((scope) => scope.kind === "word" && scope.text === "voy"));
  assert.match(analysis.baseForm, /ir/);
  assert.match(analysis.morphology, /Present indicative/);
  assert.match(analysis.syntacticRole, /near future/);
  assert.match(analysis.contrast, /Iré/);
  assert.match(analysis.relationship, /visitar/);

  const singleWordFocus = { ...lesson, grammar: { ...lesson.grammar, focus: "Voy" } };
  assert.ok(!xrayScopes(singleWordFocus, "Spanish").some((scope) => scope.kind === "phrase" && scope.text === "Mañana voy"));
});

test("makes every Vietnamese word, phrase, and whole sentence available to universal X-Ray", async () => {
  const { analyzeXRayScope, xrayScopes } = await loadLessonToolsModule();
  const lesson = {
    id: "plans", title: "Near-future plans", skill: "ir a + infinitive",
    vocabulary: [{ word: "voy", english: "I am going", vietnamese: "tôi sẽ" }, { word: "visitar", english: "to visit", vietnamese: "thăm" }],
    sentence: { target: "Mañana voy a visitar.", anchor: "Tomorrow I am going to visit.", bridge: "Ngày mai tôi sẽ đi thăm.", note: "A clear plan stays close to the present." },
    grammar: { focus: "Voy a visitar", target: { pattern: "ir a + infinitive", explanation: "Voy is the first-person form of ir." }, anchor: { pattern: "be going to + infinitive", explanation: "English uses a future frame." }, bridge: { pattern: "time + sẽ + verb", explanation: "Vietnamese uses a stable aspect marker." }, insight: "The plan is shared while the structures differ." },
  };
  const scopes = xrayScopes(lesson, "Vietnamese");
  for (const word of ["Ngày", "mai", "tôi", "sẽ", "đi", "thăm"]) assert.ok(scopes.some((scope) => scope.kind === "word" && scope.text === word));
  assert.ok(scopes.some((scope) => scope.kind === "phrase" && scope.text === "tôi sẽ"));
  const wholeSentence = scopes.find((scope) => scope.kind === "sentence");
  assert.equal(wholeSentence?.text, "Ngày mai tôi sẽ đi thăm.");
  const analysis = analyzeXRayScope(lesson, scopes.find((scope) => scope.kind === "word" && scope.text === "sẽ"));
  assert.equal(analysis.partOfSpeech, "Aspect or time marker");
  assert.match(analysis.morphology, /stays stable/);
  assert.match(analysis.relationship, /Tomorrow I am going to visit/);
  const phrase = analyzeXRayScope(lesson, scopes.find((scope) => scope.kind === "phrase" && scope.text === "tôi sẽ"));
  assert.match(phrase.contextualMeaning, /time \+ sẽ \+ verb/);
  assert.match(phrase.relationship, /Vietnamese realization/);
});

test("keeps Vietnamese origin as both a phrase and two explainable terms", async () => {
  const { analyzeXRayScope, xrayScopes } = await loadLessonToolsModule();
  const lesson = {
    id: "origin", title: "Origin", skill: "subject + ser + de",
    vocabulary: [{ word: "soy", english: "I am", vietnamese: "tôi đến từ" }],
    sentence: { target: "Soy de Indiana.", anchor: "I am from Indiana.", bridge: "Tôi đến từ Indiana.", note: "Origin is expressed through a whole relationship." },
    grammar: { focus: "Soy", target: { pattern: "soy + de", explanation: "Spanish marks the speaker in soy." }, anchor: { pattern: "I + am + from", explanation: "English uses a copular phrase." }, bridge: { pattern: "tôi + đến từ", explanation: "Vietnamese uses a stable origin phrase." }, insight: "The meaning is shared." },
  };
  const scopes = xrayScopes(lesson, "Vietnamese");
  const phrase = analyzeXRayScope(lesson, scopes.find((scope) => scope.kind === "phrase" && scope.text === "đến từ"));
  const den = analyzeXRayScope(lesson, scopes.find((scope) => scope.kind === "word" && scope.text === "đến"));
  const tu = analyzeXRayScope(lesson, scopes.find((scope) => scope.kind === "word" && scope.text === "từ"));
  assert.equal(phrase.directMeaning, "to come from; to be from");
  assert.match(phrase.usage, /Tôi đến từ Indiana/);
  assert.equal(phrase.interpretation, "phrase");
  assert.equal(den.interpretation, "standalone");
  assert.match(den.usage, /đến từ/);
  assert.match(tu.syntacticRole, /source, origin/);
});

test("resolves the Vietnamese price question into meaningful X-Ray units", async () => {
  const { analyzeXRayScope, resolveXRayTokenScope, xraySentenceBreakdown } = await loadLessonToolsModule();
  const lesson = {
    id: "price", title: "Price and quantity", skill: "numbers + demonstratives",
    vocabulary: [
      { word: "cuánto", english: "how much", vietnamese: "bao nhiêu" },
      { word: "cuesta", english: "costs", vietnamese: "giá" },
      { word: "esto", english: "this", vietnamese: "cái này" },
    ],
    sentence: { target: "¿Cuánto cuesta esto?", anchor: "How much does this cost?", bridge: "Cái này giá bao nhiêu?", note: "Ask the price of the object being indicated." },
    grammar: { focus: "Cuánto cuesta", target: { pattern: "question word + verb + demonstrative", explanation: "Spanish leads with the quantity question." }, anchor: { pattern: "how much + does + this + cost", explanation: "English adds does to form the question." }, bridge: { pattern: "demonstrative + price + how much", explanation: "Vietnamese asks what amount the object's price is." }, insight: "The languages ask for the same price through different structures." },
  };

  for (const tokenIndex of [0, 1]) assert.equal(resolveXRayTokenScope(lesson, "Vietnamese", tokenIndex)?.text, "Cái này");
  assert.equal(resolveXRayTokenScope(lesson, "Vietnamese", 2)?.text, "giá");
  for (const tokenIndex of [3, 4]) assert.equal(resolveXRayTokenScope(lesson, "Vietnamese", tokenIndex)?.text, "bao nhiêu");

  const breakdown = xraySentenceBreakdown(lesson, "Vietnamese");
  assert.deepEqual(Array.from(breakdown, (scope) => scope.text), ["Cái này", "giá", "bao nhiêu"]);
  const thisOne = analyzeXRayScope(lesson, breakdown[0]);
  const price = analyzeXRayScope(lesson, breakdown[1]);
  const howMuch = analyzeXRayScope(lesson, breakdown[2]);
  assert.equal(thisOne.partOfSpeech, "Demonstrative noun phrase");
  assert.match(thisOne.morphology, /Cái supplies a general object classifier/);
  assert.equal(price.directMeaning, "price; in this sentence, cost");
  assert.equal(howMuch.directMeaning, "how much; how many");
  assert.match(howMuch.morphology, /meaning belongs to the phrase/);
});

test("uses the canonical X-Ray engine inside every displayed sentence language", async () => {
  const [component, page] = await Promise.all([read("../app/sentence-anatomy.tsx"), read("../app/page.tsx")]);
  assert.match(page, /<InteractiveSentence[^>]*lesson=\{lesson\}/);
  assert.match(component, /xrayScopes\(lesson, activeToolLanguage\)/);
  assert.match(component, /resolveXRayTokenScope\(lesson, activeToolLanguage, word\.tokenStart\)/);
  assert.match(component, /analyzeXRayScope\(lesson, scope\)/);
  assert.match(component, /Complete sentence breakdown/);
  assert.match(component, /xraySentenceBreakdown\(lesson, scope\.language\)/);
  assert.doesNotMatch(component, /mode === "xray"[\s\S]{0,500}selectUnit\(unit/);
});

test("authors every part of the Spanish clock sentence without generic X-Ray filler", async () => {
  const { analyzeXRayScope, xrayScopes, xraySentenceBreakdown } = await loadLessonToolsModule();
  const lesson = {
    id: "clock", title: "Clock time", skill: "telling time",
    vocabulary: [
      { word: "hora", english: "time", vietnamese: "giờ" },
      { word: "media", english: "half", vietnamese: "rưỡi" },
      { word: "mañana", english: "morning", vietnamese: "buổi sáng" },
      { word: "tarde", english: "afternoon", vietnamese: "buổi chiều" },
    ],
    sentence: { target: "Son las ocho y media.", anchor: "It is eight thirty.", bridge: "Bây giờ là tám giờ rưỡi.", note: "State the current clock time." },
    grammar: { focus: "Son las", target: { pattern: "ser + article + hour", explanation: "Spanish uses a plural verb and article with hours other than one." }, anchor: { pattern: "it is + time", explanation: "English uses a singular frame." }, bridge: { pattern: "là + number + giờ", explanation: "Vietnamese keeps là stable." }, insight: "The same time is organized through three different frames." },
  };
  const scopes = xrayScopes(lesson, "Spanish");
  for (const token of ["Son", "las", "ocho", "y", "media"]) {
    const analysis = analyzeXRayScope(lesson, scopes.find((scope) => scope.kind === "word" && scope.text === token));
    assert.doesNotMatch(analysis.partOfSpeech, /Contextual sentence element/);
    assert.doesNotMatch(analysis.directMeaning, /spanish element/i);
    assert.ok(analysis.morphology.length > 25);
    assert.ok(analysis.syntacticRole.length > 25);
  }
  const focus = analyzeXRayScope(lesson, scopes.find((scope) => scope.kind === "phrase" && scope.text === "Son las"));
  assert.equal(focus.directMeaning, "it is [the plural hour]");
  assert.match(focus.morphology, /third-person plural present of ser/);
  assert.deepEqual(Array.from(xraySentenceBreakdown(lesson, "Spanish"), (scope) => scope.text), ["Son las", "ocho", "y", "media"]);
});

test("avoids generic Spanish X-Ray cards across representative curriculum patterns", async () => {
  const { analyzeXRayScope, xrayScopes } = await loadLessonToolsModule();
  const lessons = [
    { id: "request", title: "Request", skill: "querer + noun", vocabulary: [{ word: "quiero", english: "I want", vietnamese: "tôi muốn", note: "First-person present of querer." }, { word: "agua", english: "water", vietnamese: "nước" }, { word: "por favor", english: "please", vietnamese: "làm ơn" }], sentence: { target: "Quiero agua, por favor.", anchor: "I would like water, please.", bridge: "Tôi muốn nước, làm ơn.", note: "A courteous request." }, grammar: { focus: "Quiero", target: { pattern: "quiero + noun", explanation: "Quiero is the first-person form of querer." }, anchor: { pattern: "I would like + noun", explanation: "English softens the request." }, bridge: { pattern: "tôi + muốn + noun", explanation: "Vietnamese keeps muốn stable." }, insight: "Tone travels through different structures." } },
    { id: "price", title: "Price", skill: "quantity question", vocabulary: [{ word: "cuánto", english: "how much", vietnamese: "bao nhiêu" }, { word: "cuesta", english: "costs", vietnamese: "giá" }, { word: "esto", english: "this", vietnamese: "cái này" }], sentence: { target: "¿Cuánto cuesta esto?", anchor: "How much does this cost?", bridge: "Cái này giá bao nhiêu?", note: "Ask a price." }, grammar: { focus: "Cuánto cuesta", target: { pattern: "question word + verb + demonstrative", explanation: "Spanish leads with the quantity question." }, anchor: { pattern: "how much + does", explanation: "English adds does." }, bridge: { pattern: "demonstrative + price + how much", explanation: "Vietnamese ends with the quantity phrase." }, insight: "Order changes while meaning remains." } },
    { id: "plans", title: "Plans", skill: "ir a + infinitive", vocabulary: [{ word: "mañana", english: "tomorrow", vietnamese: "ngày mai" }, { word: "voy", english: "I am going", vietnamese: "tôi sẽ" }, { word: "visitar", english: "to visit", vietnamese: "thăm" }], sentence: { target: "Mañana voy a visitar a un amigo.", anchor: "Tomorrow I am going to visit a friend.", bridge: "Ngày mai tôi sẽ đi thăm một người bạn.", note: "A near-future plan." }, grammar: { focus: "Voy a visitar", target: { pattern: "ir a + infinitive", explanation: "Voy carries first person and present tense." }, anchor: { pattern: "be going to + infinitive", explanation: "English uses a future frame." }, bridge: { pattern: "time + sẽ + verb", explanation: "Vietnamese uses sẽ." }, insight: "The plan is shared." } },
  ];
  for (const lesson of lessons) {
    for (const scope of xrayScopes(lesson, "Spanish").filter((item) => item.kind === "word")) {
      const analysis = analyzeXRayScope(lesson, scope);
      assert.doesNotMatch(analysis.partOfSpeech, /Contextual sentence element/);
      assert.doesNotMatch(analysis.directMeaning, /spanish element/i);
    }
  }
});

test("ships no generic Spanish word analysis anywhere in the current curriculum", async () => {
  const [{ curriculum }, { analyzeXRayScope, xrayScopes }] = await Promise.all([loadCurriculumModule(), loadLessonToolsModule()]);
  const failures = [];
  for (const lesson of curriculum) {
    for (const scope of xrayScopes(lesson, "Spanish").filter((item) => item.kind === "word")) {
      const analysis = analyzeXRayScope(lesson, scope);
      if (/Contextual sentence element/.test(analysis.partOfSpeech) || /spanish element/i.test(analysis.directMeaning)) failures.push(`${lesson.id}:${scope.text}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("ships no generic Vietnamese word analysis anywhere in the current curriculum", async () => {
  const [{ curriculum }, { analyzeXRayScope, resolveXRayTokenScope, xrayScopes }] = await Promise.all([loadCurriculumModule(), loadLessonToolsModule()]);
  const failures = [];
  for (const lesson of curriculum) {
    for (const scope of xrayScopes(lesson, "Vietnamese").filter((item) => item.kind === "word")) {
      const resolved = resolveXRayTokenScope(lesson, "Vietnamese", scope.tokenStart) || scope;
      const analysis = analyzeXRayScope(lesson, resolved);
      if (/Contextual Vietnamese word/.test(analysis.partOfSpeech) || /vietnamese element/i.test(analysis.directMeaning)) failures.push(`${lesson.id}:${scope.text}->${resolved.text}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("ships no generic English word analysis anywhere in the current curriculum", async () => {
  const [{ curriculum }, { analyzeXRayScope, resolveXRayTokenScope, xrayScopes }] = await Promise.all([loadCurriculumModule(), loadLessonToolsModule()]);
  const failures = [];
  for (const lesson of curriculum) {
    for (const scope of xrayScopes(lesson, "English").filter((item) => item.kind === "word")) {
      const resolved = resolveXRayTokenScope(lesson, "English", scope.tokenStart) || scope;
      const analysis = analyzeXRayScope(lesson, resolved);
      if (/Contextual sentence element/.test(analysis.partOfSpeech) || /english element/i.test(analysis.directMeaning)) failures.push(`${lesson.id}:${scope.text}->${resolved.text}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("derives X-Ray language tabs from authored language realizations", async () => {
  const { analyzeXRayScope, xrayLanguages, xrayScopes } = await loadLessonToolsModule();
  const lesson = {
    id: "extended-stack", title: "Extended stack", skill: "practical pattern",
    vocabulary: [{ word: "soy", english: "I am", vietnamese: "tôi là", translations: { Italian: "io sono" } }],
    sentence: { target: "Soy de Indiana.", anchor: "I am from Indiana.", bridge: "Tôi đến từ Indiana.", translations: { Italian: "Vengo dall'Indiana." }, note: "A shared origin thought." },
    grammar: { focus: "Soy", target: { pattern: "soy + de", explanation: "Spanish pattern." }, anchor: { pattern: "I + am + from", explanation: "English pattern." }, bridge: { pattern: "tôi + đến từ", explanation: "Vietnamese pattern." }, additional: { Italian: { pattern: "venire da + place", explanation: "Italian pattern." } }, insight: "Meaning is shared." },
    xray: { Italian: { units: { "vengo": { meaning: "I come; here, I am from", baseForm: "venire", partOfSpeech: "Finite verb", syntacticRole: "Carries first-person singular and introduces origin with da.", morphology: "Present indicative, first-person singular of the irregular verb venire.", usage: "Vengo da is a natural way to state origin in Italian.", contrast: "Spanish uses soy de; Vietnamese uses đến từ." }, "dall'indiana": { meaning: "from Indiana", baseForm: "da + l'Indiana", partOfSpeech: "Contracted origin phrase", syntacticRole: "Names the place of origin introduced by da.", morphology: "Da combines with the definite article before the place name.", usage: "The contraction belongs to the complete origin expression.", contrast: "English writes from Indiana without an article contraction." } }, preferredPhrases: ["dall'Indiana"] } },
  };
  assert.deepEqual(Array.from(xrayLanguages(lesson, true)), ["Spanish", "English", "Vietnamese", "Italian"]);
  const scopes = xrayScopes(lesson, "Italian");
  assert.ok(scopes.some((scope) => scope.kind === "sentence" && scope.text === "Vengo dall'Indiana."));
  const vengo = analyzeXRayScope(lesson, scopes.find((scope) => scope.kind === "word" && scope.text === "Vengo"));
  assert.equal(vengo.baseForm, "venire");
  assert.equal(vengo.partOfSpeech, "Finite verb");
  assert.doesNotMatch(vengo.directMeaning, /italian element/i);
});

test("composes a finite Daily Lesson with review, vocabulary, application, rotation, and quiet completion", async () => {
  const { createDailyLessonPlan } = await loadLessonToolsModule();
  const makeLesson = (id, word, spanish, english, vietnamese) => ({
    id, title: id, skill: "practical pattern", vocabulary: [{ word, english: word === "voy" ? "I am going" : "I want", vietnamese: word === "voy" ? "tôi sẽ" : "tôi muốn" }],
    sentence: { target: spanish, anchor: english, bridge: vietnamese, note: "A practical thought in context." },
    grammar: { focus: spanish.split(" ").slice(0, 2).join(" "), target: { pattern: "target pattern", explanation: "Target explanation." }, anchor: { pattern: "anchor pattern", explanation: "Anchor explanation." }, bridge: { pattern: "bridge pattern", explanation: "Bridge explanation." }, insight: "The same meaning travels." },
  });
  const review = makeLesson("review", "quiero", "Quiero agua.", "I want water.", "Tôi muốn nước.");
  const current = makeLesson("current", "voy", "Voy a pagar.", "I am going to pay.", "Tôi sẽ trả tiền.");
  const plan = createDailyLessonPlan([review, current], current, ["review"], [], 4);
  assert.equal(plan.review.id, "review");
  assert.equal(plan.newVocabulary.length, 1);
  assert.equal(plan.application.target, "Voy a pagar.");
  assert.deepEqual(Array.from(plan.exercises, (item) => item.scope), ["sentence", "word", "sentence", "phrase"]);
  assert.ok(plan.exercises.some((item) => item.from === "Spanish" && item.to === "English"));
  assert.ok(plan.exercises.some((item) => item.from === "Spanish" && item.to === "Vietnamese"));
  const directions = new Set(Array.from({ length: 6 }, (_, day) => createDailyLessonPlan([review, current], current, [], ["review"], day).exercises.map((item) => `${item.from}->${item.to}`)).flat());
  for (const direction of ["English->Spanish", "Spanish->English", "English->Vietnamese", "Vietnamese->English", "Spanish->Vietnamese", "Vietnamese->Spanish"]) assert.ok(directions.has(direction));
});

test("keeps Today and universal X-Ray optional, recoverable, and separate from the existing lesson path", async () => {
  const [page, daily, xray] = await Promise.all([read("../app/page.tsx"), read("../app/daily-lesson.tsx"), read("../app/universal-xray.tsx")]);
  assert.match(page, /<DailyLesson/);
  assert.match(page, /<UniversalXRay/);
  assert.match(page, />Today</);
  assert.match(page, />X-Ray</);
  assert.match(daily, /Skip this part for now/);
  assert.match(daily, /The thread is in motion/);
  assert.match(daily, /Return to self-directed learning/);
  assert.match(xray, /Choose one word, one phrase, or the whole sentence/);
  assert.match(xray, /xray-sentence/);
  assert.match(xray, /Every language in the stack is equally available here/);
  assert.match(xray, /aria-modal/);
});

test("defines the complete CEFR progression from A1 through C2", async () => {
  const source = await read("../app/cefr.ts");
  for (const level of ["A1", "A2", "B1", "B2", "C1", "C2"]) assert.match(source, new RegExp(`level: "${level}"`));
  assert.match(source, /Basic user/);
  assert.match(source, /Independent user/);
  assert.match(source, /Proficient user/);
});
