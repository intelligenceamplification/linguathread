import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

test("the first-lesson models retain reviewed voices and verified audio lineage", async () => {
 const pack = JSON.parse(await readFile(new URL("../public/audio/packs/approved.json", import.meta.url), "utf8"));
 const review = JSON.parse(await readFile(new URL("../audio/lesson-audition-v2-review.json", import.meta.url), "utf8"));
 const matches = pack.clips.filter((clip) => clip.language === "es" && clip.normalizedText === "Soy de Indiana.");
 assert.equal(matches.length, 2);
 const male = matches.find((clip) => clip.voice === "male");
 const female = matches.find((clip) => clip.voice === "female");
 assert.equal(male.reviewedAt, review.reviewedAt);
 assert.equal(male.tempoAdjustedFromSha256, review.sha256);
 assert.equal(male.normalTempo, 0.85);
 assert.ok(female.reviewedAt);
 for (const clip of matches) {
  const bytes = await readFile(new URL(`../public${clip.url}`, import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), clip.sha256);
 }
});
