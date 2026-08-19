import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, process.argv[2]);
const outputPath = resolve(root, process.argv[3]);
const source = (await import(pathToFileURL(sourcePath))).default;

const entry = (unit, language, counterpart, lesson) => ({
  meaning: unit.meaning,
  baseForm: unit[`${language}Base`] || unit[language],
  partOfSpeech: unit[`${language}Part`] || unit.part,
  syntacticRole: unit[`${language}Role`] || unit.role,
  morphology: unit[`${language}Form`],
  usage: `In “${lesson[language === "spanish" ? "spanish" : "vietnamese"]},” ${unit[language]} contributes ${unit.meaning.toLocaleLowerCase()} as part of the authored ${lesson.skill} pattern.`,
  contrast: `${language === "spanish" ? "Vietnamese" : "Spanish"} expresses this conceptual unit as “${unit[counterpart]}.” Compare the complete construction rather than assuming identical word order or grammar.`,
});

const lessons = source.lessons.map((lesson) => {
  const spanishUnits = Object.fromEntries(lesson.units.map((unit) => [unit.spanish.toLocaleLowerCase("es"), entry(unit, "spanish", "vietnamese", lesson)]));
  const vietnameseUnits = Object.fromEntries(lesson.units.map((unit) => [unit.vietnamese.toLocaleLowerCase("vi"), entry(unit, "vietnamese", "spanish", lesson)]));
  const words = lesson.units.slice(0, 4).map((unit) => [unit.spanish, unit.meaning, unit.vietnamese]);
  while (words.length < 4) words.push([...words[words.length - 1]]);
  return {
    id: lesson.id,
    objectiveId: lesson.objectiveId,
    prerequisites: lesson.prerequisites,
    unit: lesson.unit,
    lesson: lesson.lesson,
    unitTitle: lesson.unitTitle,
    title: lesson.title,
    skill: lesson.skill,
    words,
    spanish: lesson.spanish,
    english: lesson.english,
    vietnamese: lesson.vietnamese,
    focus: lesson.focus,
    pattern: lesson.pattern,
    bridgePattern: lesson.bridgePattern,
    xray: {
      Spanish: { units: spanishUnits, preferredPhrases: lesson.units.map((unit) => unit.spanish) },
      Vietnamese: { units: vietnameseUnits, preferredPhrases: lesson.units.map((unit) => unit.vietnamese) },
    },
  };
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ schemaVersion: 1, id: source.id, version: source.version, level: source.level, lessons }, null, 2)}\n`);
console.log(`Built ${source.id}: ${lessons.length} reviewed lessons.`);
