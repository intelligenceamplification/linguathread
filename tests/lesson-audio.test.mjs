import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

test("the reviewed first-lesson model resolves to the exact auditioned audio", async () => {
 const pack = JSON.parse(await readFile(new URL("../public/audio/packs/approved.json", import.meta.url), "utf8"));
 const review = JSON.parse(await readFile(new URL("../audio/lesson-audition-v2-review.json", import.meta.url), "utf8"));
 const matches = pack.clips.filter((clip) => clip.language === "es" && clip.normalizedText === "Soy de Indiana.");
 assert.equal(matches.length, 1);
 const [clip] = matches;
 assert.equal(clip.reviewedAt, review.reviewedAt);
 assert.equal(clip.sha256, review.sha256);
 const bytes = await readFile(new URL(`../public${clip.url}`, import.meta.url));
 assert.equal(createHash("sha256").update(bytes).digest("hex"), clip.sha256);
});
