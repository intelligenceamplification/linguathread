import test from "node:test";
import assert from "node:assert/strict";
import { emptyLearnerModel, recordEvidence, reviewQueue, reviewTasks, selectNextLesson } from "../app/learning-engine.ts";

const lesson = { id: "one", objectiveId: "one", title: "Time together", skill: "belief", prerequisites: [],
  sentence: { anchor: "Time together is important.", target: "El tiempo juntos es importante.", bridge: "Thời gian bên nhau rất quan trọng." },
  mastery: { prompt: "Translate: Time together is important.", answer: "El tiempo juntos es importante.", accepted: ["El tiempo juntos es importante."] },
  bridgeMastery: { prompt: "Translate: Time together is important.", answer: "Thời gian bên nhau rất quan trọng.", accepted: ["Thời gian bên nhau rất quan trọng."] },
  recall: { prompt: "What does juntos mean?", accepted: ["together"], rescue: { answer: "together" } },
  transform: { prompt: "Together.", answer: "Juntos.", accepted: ["Juntos."] } };
const next = { ...lesson, id: "two", objectiveId: "two" };
const production = { fromLanguage: "English", toLanguage: "Spanish", fromModality: "meaning", toModality: "written", retrievalType: "production" };
const now = new Date("2026-10-21T12:00:00Z");
const earlier = new Date("2026-10-01T12:00:00Z");
function attempt(model, target, correct, edge, when = earlier, supported = false, session = "one") {
  return recordEvidence(model, lesson.id, target, correct, supported, when, edge, 1200, correct ? undefined : "production", session);
}

test("finishing a lesson advances even at the old every-four-sessions review boundary", () => {
  const model = { ...attempt(emptyLearnerModel(), "Spanish", true, production), sessionsCompleted: 4 };
  assert.equal(selectNextLesson([lesson, next], model, [lesson.id], now).lesson.id, next.id);
  assert.equal(selectNextLesson([lesson], model, [lesson.id], now).mode, "complete");
  assert.equal(reviewQueue([lesson], model, ["Spanish"], now).length, 1);
});

test("queue prioritizes Vietnamese weakness over overdue Spanish success", () => {
  let model = attempt(emptyLearnerModel(), "Spanish", true, production);
  model = attempt(model, "Vietnamese", false, { ...production, toLanguage: "Vietnamese" });
  const queue = reviewQueue([lesson], model, ["Spanish", "Vietnamese"], now);
  assert.equal(queue.length, 1);
  assert.equal(queue[0].evidence.language, "Vietnamese");
  assert.equal(queue[0].reason, "Needs strengthening");
  assert.equal(reviewQueue([lesson], model, ["Spanish"], now)[0].evidence.language, "Spanish");
});

test("retired phrases stay retired; a later failure returns the affected skill", () => {
  let model = emptyLearnerModel();
  for (let day = 1; day <= 3; day++) model = attempt(model, "Spanish", true, production, new Date(`2026-10-0${day}`), false, String(day));
  assert.equal(reviewQueue([lesson], model, ["Spanish"], now).length, 0);
  model = attempt(model, "Spanish", false, production, new Date("2026-10-19"));
  assert.equal(reviewQueue([lesson], model, ["Spanish"], now).length, 1);
});

test("successful checks and immediate retries cannot create an instant review loop", () => {
  const model = attempt(emptyLearnerModel(), "Spanish", false, production, new Date(now.getTime() - 60_000));
  assert.equal(reviewQueue([lesson], model, ["Spanish"], now).length, 0);
  assert.equal(reviewQueue([lesson], emptyLearnerModel(), ["Spanish"], now).length, 0);
});

test("an active two-language stack requires real responses in both directions", () => {
  const model = attempt(emptyLearnerModel(), "Spanish", false, production);
  const item = reviewQueue([lesson], model, ["Spanish", "Vietnamese"], now)[0];
  const tasks = reviewTasks(item, ["Spanish", "Vietnamese"]);
  assert.equal(tasks.length, 3);
  assert.equal(tasks[1].edge.toLanguage, "Spanish");
  assert.equal(tasks[2].edge.toLanguage, "Vietnamese");
  assert.equal(tasks[1].prompt, lesson.sentence.bridge);
  assert.equal(tasks[2].answer, lesson.sentence.bridge);
  assert.ok(tasks.slice(1).every(t => t.edge.retrievalType === "transfer"));
  assert.equal(reviewTasks(item, ["Spanish"]).length, 1);
});

test("listening remains listening and failed transfer reopens its exact edge", () => {
  const listening = { ...production, fromLanguage: "Spanish", toLanguage: "English", fromModality: "audio", toModality: "meaning", retrievalType: "recognition" };
  let model = attempt(emptyLearnerModel(), "Spanish", false, listening);
  let item = reviewQueue([lesson], model, ["Spanish"], now)[0];
  assert.deepEqual(reviewTasks(item, ["Spanish"])[0].edge, listening);
  const transfer = { fromLanguage: "Spanish", toLanguage: "Vietnamese", fromModality: "written", toModality: "written", retrievalType: "transfer" };
  model = attempt(emptyLearnerModel(), "Vietnamese", false, transfer);
  item = reviewQueue([lesson], model, ["Spanish", "Vietnamese"], now)[0];
  const tasks = reviewTasks(item, ["Spanish", "Vietnamese"]);
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].prompt, lesson.sentence.target);
  assert.deepEqual(tasks[0].edge, transfer);
  assert.equal(reviewQueue([lesson], model, ["Vietnamese"], now).length, 0);
});
