import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(root, "curriculum/manifest.json"), "utf8"));
const errors = [];

if (manifest.schemaVersion !== 1) errors.push("Manifest schemaVersion must be 1.");
if (manifest.courseId !== "english-spanish-vietnamese") errors.push("Unexpected courseId.");
if (!Number.isInteger(manifest.revision) || manifest.revision < 1) errors.push("Manifest revision must be positive.");
if (!Array.isArray(manifest.packs)) errors.push("Manifest packs must be an array.");

const packFiles = await readdir(resolve(root, "curriculum/packs"));
const seenLessonIds = new Set();
const seenObjectiveIds = new Set();
const tokens = (value) => value.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];

for (const descriptor of manifest.packs || []) {
  const filename = `${descriptor.id}.v${descriptor.version}.json`;
  if (!packFiles.includes(filename)) {
    errors.push(`Missing pack file: ${filename}`);
    continue;
  }
  const pack = JSON.parse(await readFile(resolve(root, "curriculum/packs", filename), "utf8"));
  if (pack.id !== descriptor.id || pack.version !== descriptor.version || pack.level !== descriptor.level) {
    errors.push(`${filename} does not match its manifest descriptor.`);
  }
  if (!Array.isArray(pack.lessons) || pack.lessons.length === 0) {
    errors.push(`${filename} has no lessons.`);
    continue;
  }
  for (const lesson of pack.lessons) {
    if (seenLessonIds.has(lesson.id)) errors.push(`Duplicate lesson id: ${lesson.id}`);
    if (seenObjectiveIds.has(lesson.objectiveId)) errors.push(`Duplicate objective id: ${lesson.objectiveId}`);
    seenLessonIds.add(lesson.id);
    seenObjectiveIds.add(lesson.objectiveId);
    if (!Array.isArray(lesson.words) || lesson.words.length < 4) errors.push(`${lesson.id} needs four vocabulary items.`);
    if (![lesson.spanish, lesson.english, lesson.vietnamese].every((value) => typeof value === "string" && value.trim())) {
      errors.push(`${lesson.id} must include Spanish, English, and Vietnamese.`);
    }
    if (!Array.isArray(lesson.prerequisites)) errors.push(`${lesson.id} prerequisites must be an array.`);
    if (descriptor.quality === "xray-reviewed") {
      for (const [language, sentenceKey] of [["Spanish", "spanish"], ["Vietnamese", "vietnamese"]]) {
        const layer = lesson.xray?.[language];
        if (!layer?.units || !Object.keys(layer.units).length) {
          errors.push(`${lesson.id} needs authored ${language} X-Ray units.`);
          continue;
        }
        const authoredTokens = tokens((layer.preferredPhrases || []).join(" "));
        for (const token of tokens(lesson[sentenceKey])) {
          if (!authoredTokens.includes(token)) errors.push(`${lesson.id} leaves ${language} token “${token}” outside reviewed X-Ray scopes.`);
        }
        for (const [unit, entry] of Object.entries(layer.units)) {
          const fields = ["meaning", "baseForm", "partOfSpeech", "syntacticRole", "morphology", "usage", "contrast"];
          if (!fields.every((field) => typeof entry[field] === "string" && entry[field].trim()) || entry.morphology.length < 16 || entry.syntacticRole.length < 12) {
            errors.push(`${lesson.id} X-Ray unit ${unit} is incomplete.`);
          }
        }
      }
    }
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Curriculum revision ${manifest.revision}: ${manifest.packs.length} pack(s), ${seenLessonIds.size} published lesson(s).`);
}
