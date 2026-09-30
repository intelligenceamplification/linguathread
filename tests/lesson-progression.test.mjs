import test from "node:test";
import assert from "node:assert/strict";
import { emptyLearnerModel, isPhraseRetired, recordEvidence, selectNextLesson } from "../app/learning-engine.ts";

const first = { id: "origin", objectiveId: "origin", sentence: { target: "Soy de Indiana." }, prerequisites: [] };
const next = { id: "next", objectiveId: "next", sentence: { target: "Vengo de otra ciudad." }, prerequisites: [] };
const course = [first, next];
const production = { fromLanguage: "English", toLanguage: "Spanish", fromModality: "meaning", toModality: "written", retrievalType: "production" };
const reading = { fromLanguage: "Spanish", toLanguage: "English", fromModality: "written", toModality: "meaning", retrievalType: "recognition" };

test("three successful retrievals in one session never retire an exact phrase", () => {
  let model = emptyLearnerModel();
  for (let attempt = 0; attempt < 4; attempt++) model = recordEvidence(model, first.id, "Spanish", true, false, new Date("2026-09-23"), production, undefined, undefined, "session-one");
  model = recordEvidence(model, first.id, "Spanish", true, true, new Date("2026-09-24"), production, undefined, undefined, "session-two");
  model = recordEvidence(model, first.id, "Spanish", true, false, new Date("2026-09-24"), reading, undefined, undefined, "session-two");
  assert.equal(isPhraseRetired(first, model), false);
  model = recordEvidence(model, first.id, "Spanish", true, false, new Date("2026-09-24"), production, undefined, undefined, "session-two");
  assert.equal(isPhraseRetired(first, model), false);
  model = recordEvidence(model, first.id, "Spanish", true, false, new Date("2026-09-25"), production, undefined, undefined, "session-three");
  assert.equal(isPhraseRetired(first, model), true);
  assert.equal(selectNextLesson(course, { ...model, sessionsCompleted: 5 }, [first.id], new Date("2026-10-30")).lesson?.id, next.id);
});

test("a later reading deficiency schedules its own brief check without invalidating writing", () => {
  let model = emptyLearnerModel();
  for (const [day, session] of [["23", "one"], ["24", "two"], ["25", "three"]]) {
    model = recordEvidence(model, first.id, "Spanish", true, false, new Date(`2026-09-${day}`), production, undefined, undefined, session);
  }
  model = recordEvidence(model, first.id, "Spanish", false, false, new Date("2026-09-26"), reading, undefined, "listening", "four");
  assert.equal(isPhraseRetired(first, model), true);
  const selected = selectNextLesson(course, { ...model, sessionsCompleted: 4 }, [first.id], new Date("2026-10-30"));
  assert.deepEqual([selected.lesson?.id, selected.mode], [first.id, "review"]);
  assert.deepEqual(selected.reviewEdge, reading);
  const skipped = selectNextLesson(course, emptyLearnerModel(), [], new Date("2026-09-27"), "Spanish", [first.id]);
  assert.deepEqual([skipped.lesson?.id, skipped.mode], [next.id, "new"]);
});

test("finished authored material does not restart the first lesson", () => {
  let model = emptyLearnerModel();
  for (const lesson of course) for (const [day, session] of [["23", "one"], ["24", "two"], ["25", "three"]]) {
    model = recordEvidence(model, lesson.id, "Spanish", true, false, new Date(`2026-09-${day}`), production, undefined, undefined, session);
  }
  assert.deepEqual(selectNextLesson(course, model, course.map((lesson) => lesson.id), new Date("2026-10-30")), { lesson: undefined, mode: "complete" });
});


test("completion never restarts elementary content without a due evidence check", () => {
  assert.equal(selectNextLesson(course, emptyLearnerModel(), course.map(x => x.id)).mode, "complete");
  let model = recordEvidence(emptyLearnerModel(), first.id, "Spanish", true, false, new Date("2026-09-30"), production, undefined, undefined, "one");
  assert.equal(selectNextLesson(course, model, course.map(x => x.id), new Date("2026-09-30")).mode, "complete");
  const due = selectNextLesson(course, model, course.map(x => x.id), new Date("2026-10-02"));
  assert.equal(due.mode, "review");
  assert.deepEqual(due.reviewEdge, production);
});

test("an unrelated bridge failure does not reopen demonstrated Spanish production", () => {
  let model = emptyLearnerModel();
  for (const day of [23, 24, 25]) model = recordEvidence(model, first.id, "Spanish", true, false, new Date(`2026-09-${day}`), production, undefined, undefined, String(day));
  model = recordEvidence(model, first.id, "Vietnamese", false, false, new Date("2026-09-26"), { ...production, toLanguage: "Vietnamese" }, undefined, "production", "four");
  assert.equal(isPhraseRetired(first, model), true);
  assert.equal(selectNextLesson([first], model, [first.id], new Date("2026-10-30")).mode, "complete");
  model = recordEvidence(model, first.id, "Spanish", false, false, new Date("2026-09-27"), production, undefined, "production", "five");
  model = recordEvidence(model, first.id, "Spanish", true, true, new Date("2026-09-28"), production, undefined, undefined, "six");
  assert.equal(isPhraseRetired(first, model), false);
  assert.equal(isPhraseRetired(first, JSON.parse(JSON.stringify(model))), false);
});
