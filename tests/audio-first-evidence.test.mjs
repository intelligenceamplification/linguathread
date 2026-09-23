import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAnswer } from "../app/answer-assessment.ts";
import { emptyLearnerModel, masteryState, recordEvidence } from "../app/learning-engine.ts";

test("assessed writing keeps meaning-bearing accents", () => {
  assert.notEqual(normalizeAnswer("como"), normalizeAnswer("cómo"));
  assert.notEqual(normalizeAnswer("ma"), normalizeAnswer("má"));
  assert.equal(normalizeAnswer("¿Dónde está?"), normalizeAnswer("dónde está"));
});

test("reading, listening, writing and spoken attempts occupy separate evidence edges", () => {
  let model = emptyLearnerModel();
  for (const [fromModality, toModality] of [["audio", "meaning"], ["written", "meaning"], ["meaning", "written"], ["meaning", "sound"]]) {
    model = recordEvidence(model, "lesson-1", "Spanish", true, toModality === "sound", new Date("2026-09-23"), {
      fromLanguage: "Spanish", toLanguage: "English", fromModality, toModality, retrievalType: "recognition",
    });
  }
  assert.equal(Object.keys(model.evidence).length, 4);
  assert.equal(Object.values(model.evidence).find((item) => item.edge.toModality === "sound").independentSuccesses, 0);
});

test("immediate repetition cannot become stable without later retrieval", () => {
  let model = emptyLearnerModel();
  for (let n = 0; n < 6; n++) model = recordEvidence(model, "lesson-1", "Spanish", true, false, new Date("2026-09-23T12:00:00Z"));
  assert.equal(masteryState(Object.values(model.evidence)[0]), "usable");
  model = recordEvidence(model, "lesson-1", "Spanish", true, false, new Date("2026-09-24T12:00:00Z"));
  assert.equal(masteryState(Object.values(model.evidence)[0]), "maintenance");
});
