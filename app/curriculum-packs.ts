import { CompactLesson, expandLesson, LessonDefinition } from "./curriculum";
import type { CEFRLevel } from "./cefr";

export type CurriculumPackDescriptor = {
  id: string;
  version: number;
  level: CEFRLevel;
  url: string;
};

export type CurriculumManifest = {
  schemaVersion: 1;
  courseId: "english-spanish-vietnamese";
  revision: number;
  packs: CurriculumPackDescriptor[];
};

type CurriculumPack = {
  schemaVersion: 1;
  id: string;
  version: number;
  level: CEFRLevel;
  lessons: CompactLesson[];
};

const levels = new Set<CEFRLevel>(["A1", "A2", "B1", "B2", "C1", "C2"]);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function validateManifest(value: unknown): CurriculumManifest {
  if (!value || typeof value !== "object") throw new Error("Manifest must be an object.");
  const manifest = value as Partial<CurriculumManifest>;
  if (manifest.schemaVersion !== 1 || manifest.courseId !== "english-spanish-vietnamese") {
    throw new Error("Unsupported curriculum manifest.");
  }
  if (!Number.isInteger(manifest.revision) || !Array.isArray(manifest.packs)) {
    throw new Error("Manifest revision and packs are required.");
  }
  const seen = new Set<string>();
  for (const pack of manifest.packs) {
    if (!text(pack.id) || !Number.isInteger(pack.version) || !levels.has(pack.level) || !text(pack.url)) {
      throw new Error("Every pack needs an id, version, CEFR level, and URL.");
    }
    if (seen.has(pack.id)) throw new Error(`Duplicate pack id: ${pack.id}`);
    seen.add(pack.id);
  }
  return manifest as CurriculumManifest;
}

function validateCompactLesson(value: unknown, level: CEFRLevel): CompactLesson {
  if (!value || typeof value !== "object") throw new Error("Lesson must be an object.");
  const lesson = value as Partial<CompactLesson>;
  const required = [
    lesson.id, lesson.objectiveId, lesson.unitTitle, lesson.title, lesson.skill,
    lesson.spanish, lesson.english, lesson.vietnamese, lesson.focus,
    lesson.pattern, lesson.bridgePattern,
  ];
  if (!required.every(text) || !Number.isInteger(lesson.unit) || !Number.isInteger(lesson.lesson)) {
    throw new Error(`Lesson ${lesson.id || "unknown"} is incomplete.`);
  }
  const lessonId = lesson.id as string;
  if (!Array.isArray(lesson.prerequisites) || !lesson.prerequisites.every(text)) {
    throw new Error(`Lesson ${lessonId} has invalid prerequisites.`);
  }
  if (!Array.isArray(lesson.words) || lesson.words.length < 4 ||
      !lesson.words.every((word) => Array.isArray(word) && word.length === 3 && word.every(text))) {
    throw new Error(`Lesson ${lessonId} needs at least four trilingual vocabulary items.`);
  }
  if (!lessonId.startsWith(`${level.toLocaleLowerCase()}-`) && !lessonId.startsWith("es-u")) {
    throw new Error(`Lesson ${lessonId} does not match pack level ${level}.`);
  }
  return lesson as CompactLesson;
}

export function validatePack(value: unknown, descriptor: CurriculumPackDescriptor): LessonDefinition[] {
  if (!value || typeof value !== "object") throw new Error(`Pack ${descriptor.id} must be an object.`);
  const pack = value as Partial<CurriculumPack>;
  if (pack.schemaVersion !== 1 || pack.id !== descriptor.id ||
      pack.version !== descriptor.version || pack.level !== descriptor.level ||
      !Array.isArray(pack.lessons) || pack.lessons.length === 0) {
    throw new Error(`Pack ${descriptor.id} does not match its manifest descriptor.`);
  }
  const lessons = pack.lessons.map((lesson) => validateCompactLesson(lesson, descriptor.level));
  const ids = new Set<string>();
  const objectives = new Set<string>();
  for (const lesson of lessons) {
    if (ids.has(lesson.id) || objectives.has(lesson.objectiveId)) {
      throw new Error(`Pack ${descriptor.id} contains duplicate lesson or objective ids.`);
    }
    ids.add(lesson.id);
    objectives.add(lesson.objectiveId);
  }
  return lessons.map((lesson) => ({ ...expandLesson(lesson), level: descriptor.level }));
}

export function mergeCurriculum(bundled: LessonDefinition[], packs: LessonDefinition[][]) {
  const byId = new Map(bundled.map((lesson) => [lesson.id, lesson]));
  for (const lessons of packs) {
    for (const lesson of lessons) {
      if (byId.has(lesson.id)) throw new Error(`Published lesson id already exists: ${lesson.id}`);
      byId.set(lesson.id, lesson);
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.level.localeCompare(b.level) || a.unit - b.unit || a.lesson - b.lesson);
}
