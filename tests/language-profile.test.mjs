import test from "node:test";
import assert from "node:assert/strict";
import {
  activeSelections, chooseAuthoritativeProfile, normalizeLanguageProfile,
  updateSelections,
} from "../app/language-profile.ts";
import { coordinateLanguageProgress, emptyLearnerModel, normalizeLearnerModel } from "../app/learning-engine.ts";
import { planStackSession } from "../app/stack-coordination.ts";

test("migrates a legacy profile without inventing languages", () => {
  const profile = normalizeLanguageProfile({ native: "English", second: "Korean", secondConfidence: "comfortable", additional: ["Japanese", "Arabic"] }, 100);
  assert.deepEqual(activeSelections(profile).map((item) => item.language), ["Korean", "Japanese", "Arabic"]);
  assert.equal(profile.schemaVersion, 2);
  assert.equal(profile.revision, 0);
});

test("bounds a six-language session while keeping the entire stack accessible", () => {
  const selections = ["Spanish", "Vietnamese", "Korean", "Mandarin Chinese", "Arabic", "Hindi"].map((language, priority) => ({ language, status: "active", priority, communicationStart: "foundations", writingStart: "foundations", addedAt: priority + 1 }));
  const plan = planStackSession(selections, coordinateLanguageProgress(emptyLearnerModel(), selections), 3);
  assert.equal(plan.focused.length, 3);
  assert.equal(plan.available.length, 6);
  assert.equal(plan.deferred.length, 3);
  assert.match(plan.explanation, /rotates next/);
});

test("newer pending local configuration wins over stale server state", () => {
  const remote = normalizeLanguageProfile({ schemaVersion: 2, revision: 4, modifiedAt: 400, native: "English", second: "Spanish", additional: [], selections: [{ language: "Spanish", status: "active", priority: 0, communicationStart: "foundations", writingStart: "foundations", addedAt: 1 }] });
  const local = updateSelections(remote, [{ language: "Korean", status: "active", priority: 0, communicationStart: "check", writingStart: "foundations", addedAt: 500 }], 500);
  assert.equal(chooseAuthoritativeProfile(local, remote), local);
  assert.deepEqual(activeSelections(local).map((item) => item.language), ["Korean"]);
});

test("pausing and re-adding a language preserves independent progress", () => {
  let model = coordinateLanguageProgress(emptyLearnerModel(), [
    { language: "Spanish", status: "active", priority: 0 },
    { language: "Korean", status: "active", priority: 1 },
  ]);
  model.languages.korean.communicationPosition = "A1-unit-3";
  model.languages.korean.writingPosition = "hangul-batchim";
  model = coordinateLanguageProgress(model, [{ language: "Korean", status: "paused", priority: 1 }]);
  model = coordinateLanguageProgress(normalizeLearnerModel(model), [{ language: "Korean", status: "active", priority: 0 }]);
  assert.equal(model.languages.korean.communicationPosition, "A1-unit-3");
  assert.equal(model.languages.korean.writingPosition, "hangul-batchim");
  assert.equal(model.languages.korean.status, "active");
});
