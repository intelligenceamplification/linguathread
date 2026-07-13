import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the PolyFlow language setup", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>PolyFlow · Language, made yours<\/title>/i);
  assert.match(html, /Your language stack/);
  assert.match(html, /What language shaped your first thoughts/);
  assert.match(html, /Search or type a language/);
  assert.match(html, /native anchor/i);
  assert.match(html, /Language begins from what you already know/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

test("ships a sequential A1 curriculum rather than one repeating foundation", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../app/curriculum.ts", import.meta.url), "utf8"));
  const lessonIds = [...source.matchAll(/id: "(es-u\d-l\d-[^"]+)"/g)].map((match) => match[1]);
  assert.equal(lessonIds.length, 8);
  assert.equal(new Set(lessonIds).size, 8);
  assert.match(source, /Names and introductions/);
  assert.match(source, /Attention and presence/);
  assert.match(source, /Human connection/);
});
