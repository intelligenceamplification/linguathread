import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../app/course-map.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const cjsModule = { exports: {} };
vm.runInNewContext(compiled, { module: cjsModule, exports: cjsModule.exports, Array, Object, Set, String });

const { courseMap, courseUnits, plannedCourseLessonCount } = cjsModule.exports;
const errors = [];
const expectedLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];

if (courseMap.length !== expectedLevels.length) errors.push("The map must contain A1 through C2.");
if (courseUnits.length !== 48) errors.push(`Expected 48 course units; found ${courseUnits.length}.`);
if (plannedCourseLessonCount !== 576) errors.push(`Expected a 576-lesson authoring target; found ${plannedCourseLessonCount}.`);

const ids = new Set();
for (const [levelIndex, stage] of courseMap.entries()) {
  if (stage.level !== expectedLevels[levelIndex]) errors.push(`Level order is invalid at ${stage.level}.`);
  if (!stage.outcome?.trim()) errors.push(`${stage.level} needs a proficiency outcome.`);
  if (stage.units.length !== 8) errors.push(`${stage.level} must contain eight sequenced units.`);
  for (const unit of stage.units) {
    if (ids.has(unit.id)) errors.push(`Duplicate unit id: ${unit.id}`);
    ids.add(unit.id);
    for (const field of ["languageFunctions", "spanishStructures", "vietnameseStructures", "domains"]) {
      if (!Array.isArray(unit[field]) || unit[field].length < 2) errors.push(`${unit.id} needs substantive ${field}.`);
    }
    if (unit.plannedLessons < 8) errors.push(`${unit.id} needs a substantial lesson target.`);
    if (!unit.outsidePractice?.purpose || !unit.outsidePractice?.prompt?.includes("GPT Live")) errors.push(`${unit.id} needs a quiet external speaking checkpoint.`);
    if (unit.sequence > 1 && !unit.prerequisiteUnitId) errors.push(`${unit.id} needs a prerequisite unit.`);
  }
}

for (const unit of courseUnits.slice(1)) {
  if (!ids.has(unit.prerequisiteUnitId)) errors.push(`${unit.id} references missing prerequisite ${unit.prerequisiteUnitId}.`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`LinguaThread course map: ${courseMap.length} CEFR levels, ${courseUnits.length} units, ${plannedCourseLessonCount} planned authored lessons.`);
}
