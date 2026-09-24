import test from "node:test";
import assert from "node:assert/strict";

test("chooses only reviewed voice variants when a reviewed model exists", async () => {
  const originalFetch = globalThis.fetch;
  const originalRandom = Math.random;
  const originalNow = Date.now;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({
    schemaVersion: 1,
    packVersion: "test",
    model: "test",
    approvedAt: "2026-09-24T00:00:00Z",
    clips: [
      { id: "old", language: "es", normalizedText: "Soy de Indiana.", url: "/old.wav" },
      { id: "male", language: "es", normalizedText: "Soy de Indiana.", url: "/male.wav", voice: "male", reviewedAt: "2026-09-24T00:00:00Z" },
      { id: "female", language: "es", normalizedText: "Soy de Indiana.", url: "/female.wav", voice: "female", reviewedAt: "2026-09-24T00:00:00Z" },
    ],
  }) });
  try {
    const { approvedAudioFor } = await import("../app/audio-pack.ts");
    Math.random = () => 0;
    assert.equal((await approvedAudioFor(" Soy de Indiana. ", "es"))?.id, "male");
    Math.random = () => 0.99;
    assert.equal((await approvedAudioFor("Soy de Indiana.", "es"))?.id, "female");
    assert.equal(await approvedAudioFor("Other phrase", "es"), null);
    const nextRefresh = Date.now() + 31_000;
    Date.now = () => nextRefresh;
    globalThis.fetch = async () => ({ ok: true, json: async () => ({
      approvedAt: "2026-09-24T01:00:00Z",
      clips: [{ id: "new", language: "es", normalizedText: "Other phrase", url: "/new.m4a" }],
    }) });
    assert.equal((await approvedAudioFor("Other phrase", "es"))?.id, "new");
  } finally {
    globalThis.fetch = originalFetch;
    Math.random = originalRandom;
    Date.now = originalNow;
  }
});
