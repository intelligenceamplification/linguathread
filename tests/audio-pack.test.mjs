import test from "node:test";
import assert from "node:assert/strict";

test("accepted preferred recordings replace older renditions only for their exact phrase", async () => {
  const before = globalThis.window;
  globalThis.window = { __LINGUATHREAD_NATIVE_AUDIO_PACK__: { approvedAt: "2026-10-21", clips: [
    { id: "old", language: "es", normalizedText: "Ahora puedo.", sha256: "old", reviewedAt: "2026-10-13" },
    { id: "cloud", language: "es", normalizedText: "Ahora puedo.", sha256: "cloud", reviewedAt: "2026-10-21", preferred: true },
    { id: "keep", language: "es", normalizedText: "Otra frase.", sha256: "keep", reviewedAt: "2026-10-13" },
  ] } };
  try {
    const { approvedAudioFor } = await import("../app/audio-pack.ts");
    assert.equal((await approvedAudioFor("Ahora puedo.", "es"))?.id, "cloud");
    assert.equal((await approvedAudioFor("Otra frase.", "es"))?.id, "keep");
  } finally { globalThis.window = before; }
});

test("personal audio window follows course progression and includes due retrieval without changing the course", async () => {
  const { nativeAudioLessonWindow, prepareNativeAudioWindow } = await import("../app/audio-pack.ts");
  const course = [
    { id: "old", level: "A1", unit: 1 },
    { id: "current-a", level: "A2", unit: 17 },
    { id: "current-b", level: "A2", unit: 17 },
    { id: "next", level: "A2", unit: 18 },
    { id: "later", level: "A2", unit: 19 },
  ];
  const before = structuredClone(course);
  assert.deepEqual(nativeAudioLessonWindow(course, "current-b", ["old", "unknown"]), ["current-a", "current-b", "next", "old"]);
  assert.deepEqual(nativeAudioLessonWindow(course, "next"), ["next", "later"]);
  assert.deepEqual(nativeAudioLessonWindow(course, "unknown"), []);
  assert.deepEqual(course, before);
  const previous = globalThis.window;
  const messages = [];
  try {
    globalThis.window = { __LINGUATHREAD_NATIVE_AUDIO_PACK__: {}, webkit: { messageHandlers: { linguathreadAudio: { postMessage: message => messages.push(message) } } } };
    prepareNativeAudioWindow(course, "next");
    assert.deepEqual(messages, [{ action: "prepareLessons", lessonIds: ["next", "later"] }]);
    delete globalThis.window.__LINGUATHREAD_NATIVE_AUDIO_PACK__;
    prepareNativeAudioWindow(course, "next");
    assert.equal(messages.length, 1);
  } finally { globalThis.window = previous; }
});

test("a later native lesson refreshes the approved catalog without querying legacy web audio", async () => {
  const { approvedAudioFor } = await import("../app/audio-pack.ts");
  const previous = globalThis.window;
  const oldFetch = globalThis.fetch;
  const nativeWindow = new EventTarget();
  nativeWindow.setTimeout = setTimeout;
  nativeWindow.clearTimeout = clearTimeout;
  nativeWindow.__LINGUATHREAD_NATIVE_AUDIO_PACK__ = { approvedAt: "2026-10-13", clips: [] };
  const requests = [];
  nativeWindow.webkit = { messageHandlers: { linguathreadAudio: { postMessage: payload => {
    requests.push(payload.action);
    queueMicrotask(() => {
      nativeWindow.__LINGUATHREAD_NATIVE_AUDIO_PACK__.clips = [{ id: "later", language: "es", text: "Más adelante.", normalizedText: "Más adelante.", sha256: "checked", url: "linguathread-audio://pack/checked.wav" }];
      nativeWindow.dispatchEvent(new Event("linguathread:native-audio-library-ready"));
    });
  } } } };
  try {
    globalThis.window = nativeWindow;
    globalThis.fetch = () => { throw new Error("Must not fetch legacy audio"); };
    assert.equal((await approvedAudioFor("Más adelante.", "es"))?.id, "later");
    assert.deepEqual(requests, ["refreshLibrary"]);
  } finally { globalThis.window = previous; globalThis.fetch = oldFetch; }
});

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
      blockedAudioSha256: ["known-bad"],
      clips: [
        { id: "blocked", language: "es", normalizedText: "Other phrase", sha256: "known-bad", reviewedAt: "2026-09-29", url: "/bad.m4a" },
        { id: "new", language: "es", normalizedText: "Other phrase", url: "/new.m4a" },
      ],
    }) });
    assert.equal((await approvedAudioFor("Other phrase", "es"))?.id, "new");
  } finally {
    globalThis.fetch = originalFetch;
    Math.random = originalRandom;
    Date.now = originalNow;
  }
});

test("native isolated pack never fetches legacy clips, even when coverage is missing", async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Legacy pack must not be queried"); };
  globalThis.window = { __LINGUATHREAD_NATIVE_AUDIO_PACK__: {
    approvedAt: "2026-10-13", clips: [
      { id: "approved-native", language: "es", normalizedText: "eres", url: "linguathread-audio://pack/valid.m4a", sha256: "good", voice: "male" },
      { id: "rejected", language: "es", normalizedText: "de", sha256: "bad", url: "linguathread-audio://pack/bad.m4a" },
    ], blockedAudioSha256: ["bad"],
  } };
  try {
    const { approvedAudioFor, requiresNativeApprovedAudio } = await import("../app/audio-pack.ts");
    assert.equal(requiresNativeApprovedAudio("es"), true);
    assert.equal(requiresNativeApprovedAudio("vi"), true);
    assert.equal(requiresNativeApprovedAudio("en"), false);
    assert.equal((await approvedAudioFor("eres", "es"))?.id, "approved-native");
    assert.equal(await approvedAudioFor("de", "es"), null);
    assert.equal(await approvedAudioFor("Mình / Tôi", "vi"), null);
    globalThis.window.__LINGUATHREAD_NATIVE_AUDIO_PACK__.approvedAt = null;
    assert.equal(await approvedAudioFor("eres", "es"), null);
  } finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});

test("a stale iPhone wrapper cannot fetch mixed voices or use system Spanish/Vietnamese", async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const messages = [];
  globalThis.window = { webkit: { messageHandlers: { linguathreadAudio: { postMessage: message => messages.push(message) } } } };
  globalThis.fetch = () => { throw new Error("A stale wrapper must never fetch legacy audio"); };
  try {
    const { approvedAudioFor, requiresNativeApprovedAudio, nativeAudioNeedsUpdate } = await import("../app/audio-pack.ts");
    for (const language of ["es", "vi"]) {
      assert.equal(requiresNativeApprovedAudio(language), true);
      assert.equal(nativeAudioNeedsUpdate(language), true);
      assert.equal(await approvedAudioFor("de", language), null);
    }
    assert.equal(nativeAudioNeedsUpdate("en"), false);
    assert.deepEqual(messages, []);
  } finally { globalThis.window = previousWindow; globalThis.fetch = previousFetch; }
});

test('missing Vietnamese vocabulary uses its approved lesson sentence, preserves exact clips, and respects blocked files', async () => {
  const previous = globalThis.window;
  const { readFile } = await import('node:fs/promises');
  const pack = JSON.parse(await readFile(new URL('../public/audio/native/library.json', import.meta.url), 'utf8'));
  const context = 'Khu này yên tĩnh hơn nơi tôi từng sống trước đây.';
  const { approvedAudioFor } = await import('../app/audio-pack.ts');
  globalThis.window = { __LINGUATHREAD_NATIVE_AUDIO_PACK__: pack };
  try {
    for (const fragment of ['Khu này', 'yên tĩnh hơn', 'nơi', 'tôi từng sống trước đây']) {
      const clip = await approvedAudioFor(fragment, 'vi', context);
      assert.ok(clip, fragment);
      assert.ok(clip.normalizedText === fragment || (clip.normalizedText === context && clip.reviewedAt));
    }
    const exact = { ...pack.clips.find(c => c.normalizedText === context), text: 'yên tĩnh hơn', normalizedText: 'yên tĩnh hơn', sha256: 'exact-test', id: 'exact-test' };
    pack.clips.push(exact);
    assert.equal((await approvedAudioFor('yên tĩnh hơn', 'vi', context)).id, 'exact-test');
    pack.blockedAudioSha256 = [...(pack.blockedAudioSha256 || []), exact.sha256];
    assert.equal((await approvedAudioFor('yên tĩnh hơn', 'vi', context)).normalizedText, context);
    pack.clips = pack.clips.filter(c => c.normalizedText !== context);
    assert.equal(await approvedAudioFor('yên tĩnh hơn', 'vi', context), null);
  } finally { globalThis.window = previous; }
});
