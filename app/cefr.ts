export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type CEFRStage = {
  level: CEFRLevel;
  band: "Basic user" | "Independent user" | "Proficient user";
  name: string;
  outcome: string;
  linguaThreadFocus: string[];
};

export const cefrFramework: CEFRStage[] = [
  {
    level: "A1",
    band: "Basic user",
    name: "Breakthrough",
    outcome: "Understand and use familiar everyday expressions, introduce oneself, and interact simply with support.",
    linguaThreadFocus: ["identity", "immediate needs", "essential questions", "present-tense foundations"],
  },
  {
    level: "A2",
    band: "Basic user",
    name: "Waystage",
    outcome: "Handle routine exchanges and describe immediate personal, family, work, shopping, and local contexts.",
    linguaThreadFocus: ["daily routines", "past reference", "comparisons", "predictable travel and service encounters"],
  },
  {
    level: "B1",
    band: "Independent user",
    name: "Threshold",
    outcome: "Manage most travel situations and produce connected language about experiences, plans, and opinions.",
    linguaThreadFocus: ["connected narration", "reasons and opinions", "problem solving", "personal and professional stories"],
  },
  {
    level: "B2",
    band: "Independent user",
    name: "Vantage",
    outcome: "Understand complex main ideas and interact with enough fluency and spontaneity for sustained exchange.",
    linguaThreadFocus: ["nuanced argument", "professional communication", "humor", "social and emotional precision"],
  },
  {
    level: "C1",
    band: "Proficient user",
    name: "Effective operational proficiency",
    outcome: "Use language flexibly and effectively for social, academic, and professional purposes.",
    linguaThreadFocus: ["implicit meaning", "register control", "extended discourse", "rhetorical and cultural nuance"],
  },
  {
    level: "C2",
    band: "Proficient user",
    name: "Mastery",
    outcome: "Understand virtually everything encountered and express subtle distinctions precisely and naturally.",
    linguaThreadFocus: ["near-native reformulation", "idiomatic command", "synthesis", "fine shades of meaning"],
  },
];

export const spanishCurriculumDimensions = [
  "communicative objectives",
  "grammar",
  "pronunciation and prosody",
  "spelling",
  "functions",
  "general and specific notions",
  "pragmatic strategies",
  "genres and discourse",
  "cultural and intercultural competence",
  "autonomous learning",
] as const;
