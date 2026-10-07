import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function moduleAt(file, imports = {}, globals = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const cjsModule = { exports: {} };
  vm.runInNewContext(compiled, { module: cjsModule, exports: cjsModule.exports, require: name => { if (!imports[name]) throw new Error(name); return imports[name]; }, Date, Set, Object, crypto, setTimeout, clearTimeout, ...globals });
  return cjsModule.exports;
}
const profiles = moduleAt("../app/language-profile.ts");
const context = moduleAt("../app/live-practice-context.ts", { "./language-profile": profiles });
const lesson = (id, title = id) => ({ id, title, objectiveId: id, level: "A1", unitTitle: "Everyday patterns", skill: "past habits", sentence: { anchor: "I used to wait here.", target: "Solía esperar aquí.", bridge: "Trước đây tôi đợi ở đây." }, grammar: { anchor: { pattern: "used to", explanation: "A past habit." }, target: { pattern: "solía + infinitive", explanation: "An idiomatic past habit." }, bridge: { pattern: "trước đây", explanation: "Past context." } }, vocabulary: Array.from({ length: 10 }, (_, index) => ({ word: `word${index}`, english: `meaning${index}`, vietnamese: `nghĩa${index}` })) });
const profile = profiles.normalizeLanguageProfile({ native: "English", second: "Spanish", additional: ["Vietnamese", "French"], selections: [{ language: "Spanish", status: "active", priority: 0 }, { language: "Vietnamese", status: "active", priority: 1 }, { language: "French", status: "paused", priority: 2 }] });
const evidence = (id, score = 20, language = "Spanish") => ({ objectiveId: id, language, attempts: 2, score, lastPracticedAt: "2026-10-06T12:00:00Z", nextReviewAt: "2026-10-05T12:00:00Z", errorType: "structural", edge: { fromLanguage: "English", toLanguage: language, fromModality: "meaning", toModality: "written", retrievalType: "production" } });
const model = { evidence: { current: evidence("current"), earlier: evidence("earlier"), paused: evidence("paused", 0, "French"), foreignEdge: { ...evidence("current"), edge: { ...evidence("current").edge, fromLanguage: "French" } } }, languages: {}, sessionsCompleted: 42 };

test("capsule uses actual active stack and authored content with meaningful diacritics", () => {
  const capsule = context.practiceCapsule(lesson("current"), profile, model, [lesson("current"), lesson("earlier")], "reverse");
  assert.deepEqual(Array.from(capsule.languages), ["Spanish", "Vietnamese"]);
  assert.equal(capsule.anchor, "English");
  assert.equal(capsule.expressions[1].text, "Solía esperar aquí.");
  assert.equal(capsule.expressions[2].text, "Trước đây tôi đợi ở đây.");
  assert.equal(capsule.vocabulary.length, 6);
  assert.equal(capsule.recent.length, 1);
  assert.equal(capsule.pathways.length, 2);
  assert.equal(capsule.lesson.stage, "reverse");
  assert.ok(!JSON.stringify(capsule).includes("French"));
});

test("capsule bounds history, ignores zero-attempt evidence, and does not mutate learning state", () => {
  const big = { ...model, evidence: Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`${i}`, evidence(`lesson${i}`)])) };
  big.evidence.none = { ...evidence("unattempted"), attempts: 0 };
  const snapshot = JSON.stringify(big);
  const course = Array.from({ length: 40 }, (_, i) => lesson(`lesson${i}`));
  const capsule = context.practiceCapsule(lesson("current"), profile, big, course, "reverse");
  assert.equal(capsule.recent.length, 2);
  assert.ok(capsule.pathways.length <= 3);
  assert.equal(JSON.stringify(big), snapshot);
  const prompt = context.livePracticePrompt(capsule);
  assert.ok(prompt.length < 6500);
  assert.match(prompt, /both directions between each pair/);
  assert.match(prompt, /attempt retrieval before supplying answers/);
  assert.doesNotMatch(prompt, /sessionsCompleted|lastPracticedAt|lastFailureAt/);
});

test("changes in lesson and profile immediately change the prepared prompt", () => {
  const one = context.livePracticePrompt(context.practiceCapsule(lesson("current", "Past habits"), profile, model, [], "reverse"));
  const changed = profiles.normalizeLanguageProfile({ native: "Vietnamese", second: "Spanish", additional: [] });
  const two = context.livePracticePrompt(context.practiceCapsule(lesson("next", "Introductions"), changed, { evidence: {} }, [], "reverse"));
  assert.notEqual(one, two);
  assert.match(two, /Anchor language: Vietnamese/);
  assert.match(two, /Current lesson: Introductions/);
  assert.doesNotMatch(two, /Relevant recent material:/);
});

test("web clipboard waits for a successful write and surfaces denial", async () => {
  let copied = "";
  const boundary = moduleAt("../app/live-practice-handoff.ts", {}, { window: {}, navigator: { clipboard: { writeText: async text => { copied = text; } } } });
  await boundary.copyPracticeContext("lesson context");
  assert.equal(copied, "lesson context");
  assert.equal(boundary.openNativeChatGPT(), false);
  assert.equal(boundary.chatGPTDestination, "https://chatgpt.com/");
  const denied = moduleAt("../app/live-practice-handoff.ts", {}, { window: {}, navigator: { clipboard: { writeText: async () => { throw new Error("denied"); } } } });
  await assert.rejects(denied.copyPracticeContext("context"), /denied/);
});

test("native copy requires acknowledgement; external open carries no prompt", async () => {
  const events = new EventTarget();
  const sent = [];
  const window = { addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), webkit: { messageHandlers: { linguathreadPractice: { postMessage: payload => {
    sent.push(payload);
    if (payload.action === "copy") events.dispatchEvent(new CustomEvent("linguathread:practice-copy", { detail: { requestID: payload.requestID, copied: true } }));
  } } } } };
  const boundary = moduleAt("../app/live-practice-handoff.ts", {}, { window });
  await boundary.copyPracticeContext("dynamic context");
  assert.equal(sent[0].text, "dynamic context");
  assert.equal(boundary.openNativeChatGPT(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(sent[1])), { action: "openChatGPT" });
});

test("handoff adds no API endpoint, keys, audio permission or duplicate initiation controls", () => {
  const component = readFileSync(new URL("../app/live-practice.tsx", import.meta.url), "utf8");
  const boundary = readFileSync(new URL("../app/live-practice-handoff.ts", import.meta.url), "utf8");
  const native = readFileSync(new URL("../ios/LinguaThread/ContentView.swift", import.meta.url), "utf8");
  assert.equal((component.match(/Start Live Practice/g) || []).length, 1);
  assert.equal((component.match(/>Open ChatGPT /g) || []).length, 1);
  assert.doesNotMatch(component + boundary, /fetch\(|OPENAI_API_KEY|RTCPeerConnection|getUserMedia|WebSocket/);
  assert.equal(existsSync(new URL("../app/api/live-practice/route.ts", import.meta.url)), false);
  assert.match(native, /universalLinksOnly: true/);
  assert.match(native, /UIPasteboard.general.string = text/);
  assert.match(native, /message.frameInfo.isMainFrame/);
});


test("one current-lesson handoff wraps every lesson activity without a stage restriction", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.equal((page.match(/<LivePractice /g) || []).length, 1);
  assert.doesNotMatch(page, /stage === [^\n]+&& <LivePractice/);
  const start = page.indexOf("<LivePractice ");
  const end = page.indexOf("</LivePractice>", start);
  for (const stage of ["listening", "transcript", "vocabulary", "recall", "sentence", "grammar", "transform", "mastery", "reverse", "spoken", "complete"]) {
    const activity = page.indexOf(`{stage === "${stage}" &&`, start);
    assert.ok(activity > start && activity < end, `${stage} keeps the same Live Practice entry`);
  }
  assert.match(page.slice(start, end), /prepareContext=\{\(\) => livePracticePrompt\(practiceCapsule\(lesson, profile, learnerModel, course, stage\)\)\}/);
});

test("personal native sharing must be acknowledged; ordinary handoff remains the default", async () => {
  const events = new EventTarget();
  let shared = false;
  const window = { __LINGUATHREAD_PERSONAL_PRACTICE_ENABLED__: true, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), webkit: { messageHandlers: { linguathreadPractice: { postMessage: payload => events.dispatchEvent(new CustomEvent("linguathread:practice-copy", { detail: { requestID: payload.requestID, copied: true, personalPracticeReady: shared } })) } } } };
  const boundary = moduleAt("../app/live-practice-handoff.ts", {}, { window });
  assert.equal(await boundary.copyPracticeContext("current lesson"), false);
  shared = true;
  assert.equal(await boundary.copyPracticeContext("next lesson"), true);
  assert.equal(boundary.hasPersonalPracticeConnection(), true);
  const web = moduleAt("../app/live-practice-handoff.ts", {}, { window: {}, navigator: { clipboard: { writeText: async () => {} } } });
  assert.equal(await web.copyPracticeContext("context"), false);
  assert.equal(web.hasPersonalPracticeConnection(), false);
});
